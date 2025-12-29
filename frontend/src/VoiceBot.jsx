import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, StopCircle, Volume2 } from 'lucide-react';
import axios from 'axios';

const VoiceBot = ({ user }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");

    // States: "idle", "listening", "processing", "speaking"
    const [botState, setBotState] = useState("idle");
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState("en");
    const selectedLanguageRef = useRef("en");

    useEffect(() => {
        selectedLanguageRef.current = selectedLanguage;
    }, [selectedLanguage]);

    const messagesEndRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const speechDetectedRef = useRef(false);
    const animationFrameRef = useRef(null);
    const activeAudioRef = useRef(null); // Ref to current playing audio
    const activityTimeoutRef = useRef(null); // Timeout for no speech
    const retryCountRef = useRef(0); // Count empty inputs (noise)

    const VAD_THRESHOLD = 0.05;
    const MAX_RETRIES = 5; // Increased to 5 to tolerate more noise
    const SILENCE_DURATION = 2500; // Increased to 2.5s to prevent cutting off early
    const INACTIVITY_TIMEOUT = 30000;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopEverything();
        };
    }, []);

    const stopEverything = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (activeAudioRef.current) {
            activeAudioRef.current.pause();
            activeAudioRef.current = null;
        }
        if (audioContextRef.current) {
            try {
                audioContextRef.current.close();
            } catch (e) {
                console.log("AudioContext already closed");
            }
            audioContextRef.current = null;
        }
        clearTimeout(silenceTimerRef.current);
        clearTimeout(activityTimeoutRef.current);
        setIsSessionActive(false);
        setBotState("idle");
    };

    const toggleSession = async () => {
        if (isSessionActive) {
            stopEverything();
        } else {
            setIsSessionActive(true);
            await startListening();
        }
    };

    const startListening = async (isRetry = false) => {
        try {
            if (!isRetry) retryCountRef.current = 0; // Reset retries on fresh start
            setBotState("listening");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Setup VAD
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            // Ensure context is running (browser policy)
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 512;
            source.connect(analyserRef.current);

            // Reset VAD flags
            speechDetectedRef.current = false;
            clearTimeout(silenceTimerRef.current);
            clearTimeout(activityTimeoutRef.current);

            // Start Inactivity Timeout (stop if no speech for 30s)
            activityTimeoutRef.current = setTimeout(() => {
                console.log("Inactivity timeout - closing session");
                setMessages(prev => [...prev, { role: 'bot', text: "(Session timed out due to inactivity)" }]);
                stopEverything();
            }, INACTIVITY_TIMEOUT);

            // Start Analysis Loop
            monitorAudioLevel();

            // Setup Recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }

            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop()); // Stop mic
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

                // If isSessionActive is true, it means we stopped due to silence (VAD)
                // If user clicked stop, isSessionActive would be false by now (in stopEverything)
                // We use sessionActiveRef to prevent uploading if stopEverything was called.
                if (sessionActiveRef.current) {
                    handleAudioUpload(blob);
                }
            };

            mediaRecorderRef.current.start();

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone.");
            setIsSessionActive(false);
            setBotState("idle");
        }
    };

    const monitorAudioLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);

        // Calculate RMS (Root Mean Square) volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const x = (dataArray[i] - 128) / 128.0;
            sum += x * x;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // VAD Logic
        if (rms > VAD_THRESHOLD) {
            if (!speechDetectedRef.current) {
                // Speech started
                speechDetectedRef.current = true;
                // console.log("Speech started");

                // Clear inactivity timeout because we have speech
                clearTimeout(activityTimeoutRef.current);
            }
            // Reset silence timer because we hear speech
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        } else if (speechDetectedRef.current) {
            // Silence detected AFTER speech
            if (!silenceTimerRef.current) {
                // console.log("Silence started via timer");
                silenceTimerRef.current = setTimeout(() => {
                    // console.log("Silence timeout - stopping recording");
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                        mediaRecorderRef.current.stop();
                    }
                }, SILENCE_DURATION);
            }
        }

        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    };

    const handleAudioUpload = async (audioBlob) => {
        // If the session was cancelled manually, don't upload
        if (!activeSessionCheck()) return;

        setBotState("processing");
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        formData.append("username", user.username);
        formData.append("language", selectedLanguageRef.current);

        try {
            const res = await axios.post('http://localhost:8000/api/voice-chat', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Check again if cancelled during request
            if (!activeSessionCheck()) return;

            const { user_text, bot_text, audio_base64 } = res.data;

            if (user_text) {
                retryCountRef.current = 0; // Reset retries on success
                setMessages(prev => [...prev, { role: 'user', text: user_text }]);
            } else {
                // No speech recognized - Check Retries
                if (retryCountRef.current < MAX_RETRIES) {
                    console.log(`No speech recognized (Noise?). Retrying ${retryCountRef.current + 1}/${MAX_RETRIES}...`);
                    retryCountRef.current += 1;
                    if (activeSessionCheck()) startListening(true);
                    return;
                }

                // Exceeded retries - CLOSE CHAT
                console.log("No speech recognized - Stopping session");
                setMessages(prev => [...prev, { role: 'bot', text: "(No speech detected, closing session)" }]);
                stopEverything();
                return;
            }

            if (bot_text) {
                setMessages(prev => [...prev, { role: 'bot', text: bot_text }]);
            }

            if (audio_base64) {
                setBotState("speaking");
                const audio = new Audio(`data:audio/wav;base64,${audio_base64}`);
                activeAudioRef.current = audio;

                audio.onended = () => {
                    activeAudioRef.current = null;
                    if (activeSessionCheck()) {
                        // Loop back to listening
                        startListening(false); // Reset retries for next turn
                    } else {
                        setBotState("idle");
                    }
                };

                audio.play();
            } else {
                if (activeSessionCheck()) startListening(false);
            }

        } catch (err) {
            console.error("Voice chat error", err);
            setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I encountered an error." }]);
            stopEverything();
        }
    };

    // Helper to check if session is theoretically active (using ref would be better but component state is okay if we are careful)
    // Actually, inside async callbacks, state might be old.
    // Let's rely on mediaRecorderRef existence as a proxy or just re-check state?
    // We'll use a ref for session status to be safe in callbacks.
    const sessionActiveRef = useRef(false);
    useEffect(() => { sessionActiveRef.current = isSessionActive; }, [isSessionActive]);

    const activeSessionCheck = () => sessionActiveRef.current;


    // Text Chat (Admin only)
    const handleSend = async (text = inputText) => {
        if (!text.trim()) return;
        setMessages([...messages, { role: 'user', text }]);
        setInputText("");
        try {
            const res = await axios.post('http://localhost:8000/api/chat', { message: text, username: user.username });
            setMessages(prev => [...prev, { role: 'bot', text: res.data.response }]);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 relative">

            {/* Messages Area - Visible to ALL users now */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-700 text-slate-200 rounded-bl-none'
                            }`}>
                            {msg.text}
                        </div>
                    </motion.div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Voice Visualization / Status Area */}
            <div className={`flex-1 flex flex-col items-center justify-center gap-8 ${user.role === 'admin' ? 'hidden' : ''}`}>
                {/* Big Status Indicator */}
                <div className="relative">
                    <motion.div
                        animate={
                            botState === "listening" ? { scale: [1, 1.2, 1], opacity: 0.5 } :
                                botState === "processing" ? { rotate: 360 } :
                                    botState === "speaking" ? { scale: [1, 1.1, 1] } :
                                        {}
                        }
                        transition={
                            botState === "listening" ? { repeat: Infinity, duration: 2 } :
                                botState === "processing" ? { repeat: Infinity, duration: 1, ease: "linear" } :
                                    botState === "speaking" ? { repeat: Infinity, duration: 0.5 } :
                                        {}
                        }
                        className={`w-40 h-40 rounded-full flex items-center justify-center blur-xl absolute top-0 left-0
                            ${botState === "listening" ? "bg-pink-500" :
                                botState === "processing" ? "bg-yellow-500" :
                                    botState === "speaking" ? "bg-green-500" : "bg-gray-500"
                            }`}
                    />
                    <div className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center border-4 
                        ${botState === "listening" ? "border-pink-500 bg-slate-900" :
                            botState === "processing" ? "border-yellow-500 bg-slate-900" :
                                botState === "speaking" ? "border-green-500 bg-slate-900" : "border-slate-700 bg-slate-900"
                        }`}>
                        {botState === "listening" && <Mic size={48} className="text-pink-500" />}
                        {botState === "processing" && <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />}
                        {botState === "speaking" && <Volume2 size={48} className="text-green-500" />}
                        {botState === "idle" && <Mic size={48} className="text-gray-500" />}
                    </div>
                </div>

                <div className="h-8 text-center">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={botState}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-xl font-medium text-slate-300"
                        >
                            {botState === "idle" && "Click to Start"}
                            {botState === "listening" && "Listening..."}
                            {botState === "processing" && "Thinking..."}
                            {botState === "speaking" && "Speaking..."}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>


            {/* Controls */}
            <div className={`glass-panel p-2 flex items-center gap-2 rounded-full ${user.role !== 'admin' ? 'justify-center w-auto mx-auto mb-8' : ''}`}>
                {/* Language Toggle */}
                <div className={`flex bg-slate-800 rounded-full p-1 mr-2 ${isSessionActive ? 'opacity-50 pointer-events-none' : ''}`}>
                    <button
                        disabled={isSessionActive}
                        onClick={() => setSelectedLanguage("en")}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${selectedLanguage === 'en' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        EN
                    </button>
                    <button
                        disabled={isSessionActive}
                        onClick={() => setSelectedLanguage("tr")}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${selectedLanguage === 'tr' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        TR
                    </button>
                </div>

                <motion.button
                    onClick={toggleSession}
                    whileTap={{ scale: 0.9 }}
                    className={`p-4 rounded-full transition-all ${isSessionActive
                        ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                        : 'bg-indigo-500 hover:bg-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.5)]'
                        }`}
                >
                    {isSessionActive ? <StopCircle size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
                </motion.button>

                {user.role === 'admin' && (
                    <>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-500"
                        />
                        <button onClick={() => handleSend()} className="p-2 text-indigo-400 hover:text-indigo-300">
                            <Send size={20} />
                        </button>
                    </>
                )}
            </div>

            {/* Legend/Hint */}
            {user.role !== 'admin' && (
                <div className="absolute bottom-4 left-0 right-0 text-center text-slate-600 text-xs">
                    {botState === 'listening'
                        ? "Silence will automatically send your message."
                        : "Tap the mic to start a hands-free session."
                    }
                </div>
            )}
        </div>
    );
};

export default VoiceBot;
