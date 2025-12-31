import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';
import AudioVisualizer from '../components/AudioVisualizer';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import { Mic, MicOff, Globe, Activity } from 'lucide-react';

const VoiceAgent = () => {
    // 1. Logic Layer (Hook)
    const {
        isConnected,
        isRecording,
        messages,
        language,
        setLanguage,
        startRecording,
        stopRecording,
        audioContext,
        sourceNode
    } = useVoiceAgent('tr');

    // 2. View Layer (Refs for Animation)
    const messagesEndRef = useRef(null);
    const micButtonRef = useRef(null);
    const chatContainerRef = useRef(null);

    // Scroll & Animate new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        if (messages.length > 0) {
            const lastMsg = document.getElementById(`msg-${messages[messages.length - 1].id}`);
            if (lastMsg) {
                anime({
                    targets: lastMsg,
                    opacity: [0, 1],
                    translateY: [20, 0],
                    easing: 'easeOutQuad',
                    duration: 400
                });
            }
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-full">
            {/* Header Section */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Voice Agent Workspace</h2>
                    <p className="text-slate-400 mt-1">Real-time conversational AI powered by SNA Neural Engine</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => setLanguage('tr')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${language === 'tr' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        TR
                    </button>
                    <button
                        onClick={() => setLanguage('en')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${language === 'en' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        EN
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* Center: Chat Interface */}
                <div className="col-span-8 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative">
                    {/* Chat History */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-6" ref={chatContainerRef}>
                        {messages.map((msg) => (
                            <div
                                id={`msg-${msg.id}`}
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm text-base leading-relaxed ${msg.sender === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : msg.sender === 'system'
                                        ? 'bg-slate-800/50 text-slate-400 text-xs py-2 px-4 rounded-full mx-auto border border-white/5'
                                        : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Control Bar */}
                    <div className="bg-slate-950/80 backdrop-blur-xl border-t border-slate-800 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                {isConnected ? 'System Online' : 'Disconnected'}
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                <Activity size={12} />
                                <span>Latency: ~20ms</span>
                            </div>
                        </div>

                        <button
                            ref={micButtonRef}
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`relative group overflow-hidden px-8 py-3 rounded-xl font-bold transition-all duration-300 transform active:scale-95 ${isRecording
                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                                : 'bg-white hover:bg-blue-50 text-slate-900 shadow-lg shadow-white/10'
                                }`}
                        >
                            <div className="flex items-center gap-2 relative z-10">
                                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                                <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
                            </div>
                            {isRecording && <span className="absolute inset-0 bg-red-400 animate-ping opacity-20 rounded-xl" />}
                        </button>
                    </div>
                </div>

                {/* Right Panel: Visualization & Stats */}
                <div className="col-span-4 space-y-6 flex flex-col">
                    {/* Visualizer Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col shadow-xl">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-blue-500" />
                            Audio Input Frequency
                        </h3>
                        {/* Canvas Visualizer */}
                        <AudioVisualizer
                            isRecording={isRecording}
                            audioContext={audioContext}
                            sourceNode={sourceNode}
                        />
                    </div>

                    {/* Session Info */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex-1 shadow-xl">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <Globe size={18} className="text-indigo-500" />
                            Session Details
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                                <span className="text-slate-400">Language Model</span>
                                <span className="text-white font-medium">Qwen 2.5 1.5B</span>
                            </div>
                            <div className="flex justify-between p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                                <span className="text-slate-400">Voice Engine</span>
                                <span className="text-white font-medium">Edge TTS Neural</span>
                            </div>
                            <div className="flex justify-between p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                                <span className="text-slate-400">Session ID</span>
                                <span className="text-slate-400 font-mono">#SNA-8291</span>
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-800">
                                <p className="text-slate-500 text-xs leading-relaxed">
                                    SNA Consulting AI systems are monitored for quality assurance.
                                    Voice data is processed locally where applicable.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceAgent;
