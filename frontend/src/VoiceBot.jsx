import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, StopCircle, Volume2, MessageSquare, Settings, X, Globe } from 'lucide-react';
import axios from 'axios';

const VoiceBot = ({ user }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [showChat, setShowChat] = useState(false); // Toggle for mobile/focus mode

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
    const activeAudioRef = useRef(null);
    const activityTimeoutRef = useRef(null);
    const retryCountRef = useRef(0);
    const botStateRef = useRef("idle");
    const streamRef = useRef(null);

    // Audio Visualizer Data
    const [audioLevel, setAudioLevel] = useState(0);

    const VAD_THRESHOLD = 0.1;
    const MAX_RETRIES = 5;
    const SILENCE_DURATION = 2500;
    const INACTIVITY_TIMEOUT = 30000;

    useEffect(() => { botStateRef.current = botState; }, [botState]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, showChat]);

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
            try { audioContextRef.current.close(); } catch (e) { }
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        clearTimeout(silenceTimerRef.current);
        clearTimeout(activityTimeoutRef.current);
        setIsSessionActive(false);
        setBotState("idle");
        setAudioLevel(0);
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
            if (!isRetry) retryCountRef.current = 0;
            setBotState("listening");

            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

            let stream = streamRef.current;
            if (!stream || !stream.active) {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                });
                streamRef.current = stream;
            }

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            if (analyserRef.current) analyserRef.current.disconnect();

            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 512;
            source.connect(analyserRef.current);

            speechDetectedRef.current = false;
            clearTimeout(silenceTimerRef.current);
            clearTimeout(activityTimeoutRef.current);

            activityTimeoutRef.current = setTimeout(() => {
                setMessages(prev => [...prev, { role: 'bot', text: "(Session timed out due to inactivity)" }]);
                stopEverything();
            }, INACTIVITY_TIMEOUT);

            monitorAudioLevel();

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
                if (sessionActiveRef.current) {
                    handleAudioUpload(blob);
                }
            };

            mediaRecorderRef.current.start();

        } catch (err) {
            console.error(err);
            alert("Could not access microphone.");
            stopEverything();
        }
    };

    const monitorAudioLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const x = (dataArray[i] - 128) / 128.0;
            sum += x * x;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Update visualizer state (scaled for easier animation values)
        setAudioLevel(Math.min(rms * 10, 1.5));

        if (activeAudioRef.current && rms > VAD_THRESHOLD) {
            activeAudioRef.current.pause();
            activeAudioRef.current = null;
            startListening(false);
            return;
        }

        if (botStateRef.current === "listening") {
            if (rms > VAD_THRESHOLD) {
                if (!speechDetectedRef.current) {
                    speechDetectedRef.current = true;
                    clearTimeout(activityTimeoutRef.current);
                }
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            } else if (speechDetectedRef.current) {
                if (!silenceTimerRef.current) {
                    silenceTimerRef.current = setTimeout(() => {
                        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                            mediaRecorderRef.current.stop();
                        }
                    }, SILENCE_DURATION);
                }
            }
        }

        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    };

    const handleAudioUpload = async (audioBlob) => {
        if (!activeSessionCheck()) return;

        setBotState("processing");
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        formData.append("username", user.username);
        formData.append("language", selectedLanguageRef.current);

        try {
            // Fake delay for better UX on super fast responses? Optional.
            const res = await axios.post('http://localhost:8000/api/voice-chat', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (!activeSessionCheck()) return;

            const { user_text, bot_text, audio_base64 } = res.data;

            if (user_text) {
                retryCountRef.current = 0;
                setMessages(prev => [...prev, { role: 'user', text: user_text }]);
            } else {
                if (retryCountRef.current < MAX_RETRIES) {
                    retryCountRef.current += 1;
                    if (activeSessionCheck()) startListening(true);
                    return;
                }
                setMessages(prev => [...prev, { role: 'bot', text: "(No speech recognized)" }]);
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
                        startListening(false);
                    } else {
                        setBotState("idle");
                    }
                };
                audio.play();
            } else {
                if (activeSessionCheck()) startListening(false);
            }

        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'bot', text: "Error processing request." }]);
            stopEverything();
        }
    };

    const sessionActiveRef = useRef(false);
    useEffect(() => { sessionActiveRef.current = isSessionActive; }, [isSessionActive]);
    const activeSessionCheck = () => sessionActiveRef.current;

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

    // --- Render Helpers ---

    return (
        <div className="flex h-screen w-full relative overflow-hidden">

            {/* Left/Center: Voice Interface */}
            <div className={`flex-1 flex flex-col items-center justify-center p-6 transition-all duration-500 relative
                 ${showChat ? 'lg:w-[65%]' : 'w-full'}`}>

                {/* Top Bar */}
                <div className="absolute top-6 w-full max-w-4xl flex justify-between items-center px-6 z-10 text-slate-400">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                        <span className="text-sm font-medium tracking-wide">SYSTEM ONLINE</span>
                    </div>

                    <button
                        onClick={() => setShowChat(!showChat)}
                        className="p-3 rounded-full hover:bg-slate-800/50 transition-colors hidden lg:block"
                    >
                        <MessageSquare size={20} className={showChat ? "text-violet-400" : ""} />
                    </button>
                </div>

                {/* Main Visualizer Orb */}
                <div className="relative flex items-center justify-center mb-16">
                    {/* Ring 1 (Pulse) */}
                    <motion.div
                        animate={{
                            scale: botState === 'listening' ? [1, 1.2 + audioLevel, 1] :
                                botState === 'speaking' ? [1, 1.05, 1] : 1,
                            opacity: botState === 'listening' ? 0.3 : 0.1,
                        }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-violet-600 to-pink-600 blur-3xl"
                    />

                    {/* Ring 2 (Core Glow) */}
                    <motion.div
                        animate={{
                            scale: botState === 'processing' ? [1, 0.9, 1] : 1,
                            rotate: botState === 'processing' ? 360 : 0
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute w-64 h-64 rounded-full border border-white/10 shadow-[0_0_50px_-12px_rgba(124,58,237,0.3)]"
                    />

                    {/* Core Orb */}
                    <motion.div
                        className={`w-40 h-40 rounded-full flex items-center justify-center glass-panel z-20 relative overflow-hidden transition-colors duration-500
                            ${botState === 'listening' ? "shadow-[0_0_40px_rgba(219,39,119,0.4)]" :
                                botState === 'speaking' ? "shadow-[0_0_40px_rgba(16,185,129,0.4)]" :
                                    "shadow-[0_0_40px_rgba(124,58,237,0.2)]"}`
                        }
                    >
                        {/* Core Icon */}
                        <div className="z-30">
                            {botState === 'idle' && <Mic size={40} className="text-slate-500" />}
                            {botState === 'listening' && (
                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                    <Mic size={40} className="text-pink-400" />
                                </motion.div>
                            )}
                            {botState === 'processing' && (
                                <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                            )}
                            {botState === 'speaking' && (
                                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity }}>
                                    <Volume2 size={40} className="text-emerald-400" />
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Status Text inside glass pill */}
                <div className="glass-panel px-6 py-2 rounded-full mb-12 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full animate-pulse
                         ${botState === 'idle' ? 'bg-slate-500' :
                            botState === 'listening' ? 'bg-pink-500' :
                                botState === 'processing' ? 'bg-violet-500' : 'bg-emerald-500'}`}
                    />
                    <span className="text-sm font-medium tracking-wide bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent uppercase">
                        {botState === "idle" && "Ready to start"}
                        {botState === "listening" && "Listening..."}
                        {botState === "processing" && "Processing response..."}
                        {botState === "speaking" && "Speaking..."}
                    </span>
                </div>

                {/* Floating Control Bar */}
                <div className="glass-panel p-2 flex items-center gap-4 rounded-2xl relative z-30">
                    {/* Language Switcher */}
                    <div className="flex bg-slate-950/50 rounded-xl p-1">
                        <button
                            onClick={() => setSelectedLanguage('en')}
                            disabled={isSessionActive}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedLanguage === 'en' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >EN</button>
                        <button
                            onClick={() => setSelectedLanguage('tr')}
                            disabled={isSessionActive}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedLanguage === 'tr' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >TR</button>
                    </div>

                    <div className="h-8 w-[1px] bg-white/10" />

                    {/* Main Action Button */}
                    <button
                        onClick={toggleSession}
                        className={`p-4 rounded-xl transition-all duration-300 flex items-center gap-2 font-semibold min-w-[140px] justify-center
                            ${isSessionActive
                                ? 'bg-red-500/90 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                                : 'bg-white text-slate-900 hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                            }`}
                    >
                        {isSessionActive ? (
                            <>
                                <StopCircle size={20} />
                                <span>End Session</span>
                            </>
                        ) : (
                            <>
                                <Mic size={20} />
                                <span>Start Chat</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Mobile Toggle for Chat */}
                <button
                    onClick={() => setShowChat(!showChat)}
                    className="lg:hidden absolute top-6 right-6 p-3 glass-panel rounded-full"
                >
                    <MessageSquare size={20} />
                </button>

            </div>

            {/* Right Panel: Chat History (Collapsible) */}
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed inset-y-0 right-0 w-full lg:w-[400px] lg:relative lg:block glass-panel m-0 lg:m-4 lg:rounded-3xl border-0 lg:border border-l lg:border-white/10 flex flex-col z-40 bg-slate-950/90 backdrop-blur-3xl lg:bg-transparent"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex justify-between items-center">
                            <span className="font-semibold text-lg tracking-tight pl-2">Transcript</span>
                            <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/5 rounded-lg lg:hidden">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-8 opacity-50">
                                    <MessageSquare size={48} className="mb-4 stroke-1" />
                                    <p>Conversation history will appear here.</p>
                                </div>
                            )}
                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-violet-600 text-white rounded-br-sm shadow-lg shadow-violet-900/20'
                                            : 'bg-slate-800/50 text-slate-200 border border-white/5 rounded-bl-sm'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input (Admin Only or Fallback) */}
                        {user.role === 'admin' && (
                            <div className="p-4 border-t border-white/5">
                                <div className="glass-panel p-1 flex items-center rounded-xl bg-slate-900/50">
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Type a message..."
                                        className="bg-transparent border-0 focus:ring-0 text-sm px-4"
                                    />
                                    <button
                                        onClick={() => handleSend()}
                                        className="p-2 bg-slate-800 hover:bg-violet-600 rounded-lg transition-colors text-white"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VoiceBot;
