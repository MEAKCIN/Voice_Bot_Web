import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const VoiceBot = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
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

    // Initialize Audio Context
    useEffect(() => {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext({ sampleRate: 24000 }); // Match backend request/response
        return () => {
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    const connectWebSocket = () => {
        // Assuming fastrtc mounts at /websocket/stream or similar? 
        // Actually standard Gradio usage often implies `/queue/join`. 
        // BUT fastrtc.mount(app) might expose a direct WS. 
        // Let's try the standard fastrtc endpoint if documented, otherwise guess `/stream/audio`.
        // Looking at fastrtc source or examples is best. 
        // Assuming for now it exposes a standard WS at `ws://localhost:8000/stream/audio` logic?
        // If not, we might need to debug. Let's try a generic WS endpoint that we hope exists or we might need to adjust backend to expose one if fastrtc doesn't make it obvious.
        // Wait, stream.mount(app) typically makes a Gradio app at `/`. 
        // So WS might be `ws://localhost:8000/queue/join` (Gradio protocol).

        // FOR SAFETY: Let's assume we need to implement a dedicated simple WS endpoint in backend if fastrtc is too opaque?
        // No, let's trust fastrtc does something standard. 
        // Actually, to be safe and "FastRTC & WebSockets" compliant as requested, let's implement a DIRECT WebSocket endpoint in `rtc_stream.py` or `main.py` that WRAPS the fastrtc logic?
        // No, `stream.mount` does it.

        // Connect to the custom WebSocket endpoint defined in backend/main.py
        const ws = new WebSocket("ws://localhost:8000/websocket/offer");

        ws.binaryType = "arraybuffer";

        ws.onopen = () => {
            console.log("WebSocket Connected");
            setIsConnected(true);
        };

        ws.onmessage = async (event) => {
            if (event.data instanceof ArrayBuffer) {
                // Queue audio to play
                audioQueueRef.current.push(event.data);
                playQueue();
            } else {
                // Maybe text stats?
                console.log("WS Message:", event.data);
            }
        };

        ws.onclose = () => {
            console.log("WebSocket Disconnected");
            setIsConnected(false);
            setIsRecording(false);
        };

        wsRef.current = ws;
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
            source.onended = () => {
                isPlayingRef.current = false;
                playQueue();
            };
            source.start();
        } catch (e) {
            console.error("Audio Decode Error", e);
            isPlayingRef.current = false;
        }
    };

    const startRecording = async () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            connectWebSocket();
            // Wait a bit?
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
                // Convert float32 to int16 
                // FastRTC default often handles numpy array (float) if pickle?
                // Let's send raw pcm int16 bytes.
                const pcmBuffer = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    pcmBuffer[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }

                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(pcmBuffer.buffer);
                }
            };

            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(ctx.destination); // Needed for Chrome?
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
        // Keep WS open for receiving response?
        // Usually yes.
    };

    return (
        <div className="h-screen w-full bg-slate-900 text-white flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 bg-slate-700 border-b border-slate-600 flex justify-between items-center">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        FastRTC Voice Bot
                    </h1>
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>

                <div className="h-96 p-6 overflow-y-auto space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl p-4 ${msg.sender === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-slate-600 text-gray-100 rounded-bl-none'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-slate-800 border-t border-slate-700 flex justify-center">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors ${isRecording
                            ? 'bg-red-500 shadow-red-500/50'
                            : 'bg-cyan-500 shadow-cyan-500/50'
                            }`}
                    >
                        {isRecording ? (
                            <div className="w-8 h-8 bg-white rounded-md" />
                        ) : (
                            <div className="w-0 h-0 border-l-[20px] border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-2" />
                        )}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};

export default VoiceBot;
