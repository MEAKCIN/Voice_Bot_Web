import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';

const VoiceBot = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('tr');
    const [messages, setMessages] = useState([
        { id: 1, text: "Conversation started.", sender: "system" }
    ]);

    const audioContextRef = useRef(null);
    const wsRef = useRef(null);
    const processorRef = useRef(null);
    const sourceRef = useRef(null);
    const audioQueueRef = useRef([]);
    const isPlayingRef = useRef(false);
    const isRecordingRef = useRef(false);
    const currentSourceNodeRef = useRef(null);

    // Anime Refs
    const containerRef = useRef(null);
    const micButtonRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Initial Animation
    useEffect(() => {
        anime({
            targets: containerRef.current,
            opacity: [0, 1],
            translateY: [20, 0],
            easing: 'easeOutExpo',
            duration: 1000,
            delay: 200
        });
    }, []);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        // Animate new message
        if (messages.length > 0) {
            const lastMsg = document.getElementById(`msg-${messages[messages.length - 1].id}`);
            if (lastMsg) {
                anime({
                    targets: lastMsg,
                    opacity: [0, 1],
                    translateX: messages[messages.length - 1].sender === 'user' ? [20, 0] : [-20, 0],
                    easing: 'easeOutQuad',
                    duration: 400
                });
            }
        }
    }, [messages]);

    // Mic Pulse Animation
    useEffect(() => {
        if (isRecording) {
            anime({
                targets: micButtonRef.current,
                scale: [1, 1.1],
                boxShadow: ['0 0 0 0px rgba(6, 182, 212, 0.7)', '0 0 0 20px rgba(6, 182, 212, 0)'],
                loop: true,
                duration: 1500,
                easing: 'easeInOutSine'
            });
        } else {
            anime.remove(micButtonRef.current);
            anime({
                targets: micButtonRef.current,
                scale: 1,
                boxShadow: '0 0 0 0px rgba(0,0,0,0)',
                duration: 300,
                easing: 'easeOutQuad'
            });
        }
    }, [isRecording]);

    // Initialize Audio Context
    useEffect(() => {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        return () => {
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    const connectWebSocket = () => {
        const ws = new WebSocket("ws://localhost:8000/websocket/offer");
        ws.binaryType = "arraybuffer";

        ws.onopen = () => {
            console.log("WebSocket Connected");
            setIsConnected(true);
            ws.send(JSON.stringify({ type: "config", lang: selectedLanguage }));
        };

        ws.onmessage = async (event) => {
            if (event.data instanceof ArrayBuffer) {
                audioQueueRef.current.push(event.data);
                playQueue();
            } else {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === "interrupt") {
                        console.log("Interruption signal received. Stopping audio.");
                        stopAudio();
                    } else if (msg.type === "user_transcription") {
                        setMessages(prev => [...prev, { id: Date.now(), text: msg.text, sender: "user" }]);
                    } else if (msg.type === "ai_response") {
                        setMessages(prev => [...prev, { id: Date.now(), text: msg.text, sender: "ai" }]);
                    }
                } catch (e) {
                    console.log("WS Message (Text):", event.data);
                }
            }
        };

        ws.onclose = () => {
            console.log("WebSocket Disconnected");
            setIsConnected(false);
            setIsRecording(false);
        };

        wsRef.current = ws;
    };

    const stopAudio = () => {
        audioQueueRef.current = [];
        if (currentSourceNodeRef.current) {
            try { currentSourceNodeRef.current.stop(); } catch (e) { }
            currentSourceNodeRef.current = null;
        }
        isPlayingRef.current = false;
    };

    const playQueue = async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
        isPlayingRef.current = true;

        try {
            const chunk = audioQueueRef.current.shift();
            const audioBuffer = await audioContextRef.current.decodeAudioData(chunk);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);

            currentSourceNodeRef.current = source;

            source.onended = () => {
                isPlayingRef.current = false;
                currentSourceNodeRef.current = null;
                playQueue();
            };
            source.start();
        } catch (e) {
            console.error("Audio Decode Error", e);
            isPlayingRef.current = false;
            currentSourceNodeRef.current = null;
            playQueue();
        }
    };

    const startRecording = async () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            connectWebSocket();
            await new Promise(r => setTimeout(r, 500));
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            setIsRecording(true);
            isRecordingRef.current = true;

            const ctx = audioContextRef.current;
            sourceRef.current = ctx.createMediaStreamSource(stream);
            processorRef.current = ctx.createScriptProcessor(4096, 1, 1);

            processorRef.current.onaudioprocess = (e) => {
                if (!isRecordingRef.current) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBuffer = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    pcmBuffer[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }

                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(pcmBuffer.buffer);
                }
            };

            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(ctx.destination);
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        isRecordingRef.current = false;
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current.onaudioprocess = null;
        }
        if (sourceRef.current) sourceRef.current.disconnect();
    };

    const toggleLanguage = (lang) => {
        setSelectedLanguage(lang);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "config", lang: lang }));
        }
    };

    return (
        <div className="h-screen w-full bg-neutral-900 text-white flex flex-col items-center justify-center p-4 selection:bg-cyan-500 selection:text-white">
            <div
                ref={containerRef}
                className="w-full max-w-3xl bg-neutral-800/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px]"
            // style={{ opacity: 0 }} // Removed for safety
            >
                {/* Header */}
                <div className="p-6 bg-neutral-800/50 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                        <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
                            VoiceAI Agent
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-black/30 rounded-lg p-1 backdrop-blur-md">
                            <button
                                onClick={() => toggleLanguage('tr')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-300 ${selectedLanguage === 'tr' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20' : 'text-neutral-400 hover:text-white'}`}
                            >
                                TR
                            </button>
                            <button
                                onClick={() => toggleLanguage('en')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-300 ${selectedLanguage === 'en' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20' : 'text-neutral-400 hover:text-white'}`}
                            >
                                EN
                            </button>
                        </div>
                        <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${isConnected ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`} />
                    </div>
                </div>

                {/* Chat Log */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-neutral-800/30 to-black/20">
                    {messages.map((msg) => (
                        <div
                            id={`msg-${msg.id}`}
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        // style={{ opacity: 0 }} 
                        >
                            <div className={`max-w-[80%] rounded-2xl p-4 shadow-lg backdrop-blur-sm ${msg.sender === 'user'
                                ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-br-none'
                                : msg.sender === 'system'
                                    ? 'bg-neutral-700/50 text-neutral-400 text-xs py-2 px-3 rounded-full mx-auto'
                                    : 'bg-neutral-700/80 text-gray-100 rounded-bl-none border border-white/5'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Controls */}
                <div className="p-8 bg-neutral-900/50 backdrop-blur-md border-t border-white/5 flex justify-center items-center relative">
                    <button
                        ref={micButtonRef}
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors z-10 ${isRecording
                            ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-xl'
                            : 'bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-2xl shadow-cyan-500/20 hover:shadow-cyan-500/40'
                            }`}
                    >
                        {isRecording ? (
                            <div className="w-8 h-8 bg-white rounded-md transition-transform" />
                        ) : (
                            <svg className="w-8 h-8 text-white ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        )}
                    </button>
                    <p className="absolute bottom-3 text-xs text-neutral-500 font-medium tracking-wide">
                        {isRecording ? "Listening..." : "Tap to Speak"}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VoiceBot;
