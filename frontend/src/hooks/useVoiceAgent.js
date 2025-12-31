import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketService } from '../services/websocket';

export const useVoiceAgent = (initialLang = 'tr') => {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "System ready. Listening for input...", sender: "system" }
    ]);
    const [language, setLanguage] = useState(initialLang);

    // Audio & Processing Refs
    const audioContextRef = useRef(null);
    const processorRef = useRef(null);
    const sourceRef = useRef(null);
    const audioQueueRef = useRef([]);
    const isPlayingRef = useRef(false);
    const isRecordingRef = useRef(false);
    const currentSourceNodeRef = useRef(null);
    const wsServiceRef = useRef(null);

    // Initialize AudioContext
    useEffect(() => {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });

        wsServiceRef.current = new WebSocketService("ws://localhost:8000/websocket/offer");

        // Setup WS Callbacks
        wsServiceRef.current.onOpen = () => {
            setIsConnected(true);
            wsServiceRef.current.sendConfig(language);
        };

        wsServiceRef.current.onClose = () => {
            setIsConnected(false);
            stopRecording();
        };

        wsServiceRef.current.onMessage = handleMessage;

        return () => {
            if (audioContextRef.current) audioContextRef.current.close();
            if (wsServiceRef.current) wsServiceRef.current.close();
        };
    }, []);

    // Update Language Config when state changes
    useEffect(() => {
        if (wsServiceRef.current && isConnected) {
            wsServiceRef.current.sendConfig(language);
        }
    }, [language, isConnected]);

    const handleMessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
            audioQueueRef.current.push(event.data);
            playQueue();
        } else {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === "interrupt") {
                    console.log("Interrupt received");
                    stopAudio();
                } else if (msg.type === "user_transcription") {
                    setMessages(prev => [...prev, { id: Date.now(), text: msg.text, sender: "user" }]);
                } else if (msg.type === "ai_response") {
                    setMessages(prev => [...prev, { id: Date.now(), text: msg.text, sender: "ai" }]);
                }
            } catch (e) {
                console.warn("Parse Error", e);
            }
        }
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
            console.error("Audio Decode Failed", e);
            isPlayingRef.current = false;
            playQueue();
        }
    };

    const stopAudio = () => {
        audioQueueRef.current = [];
        if (currentSourceNodeRef.current) {
            try { currentSourceNodeRef.current.stop(); } catch (e) { }
            currentSourceNodeRef.current = null;
        }
        isPlayingRef.current = false;
    };

    const startRecording = async () => {
        if (!wsServiceRef.current.isOpen()) {
            wsServiceRef.current.connect();
            // Wait slightly for connection?Ideally onOpen handles it, but for UX we just start logic
            await new Promise(r => setTimeout(r, 500));
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            setIsRecording(true);
            isRecordingRef.current = true; // Ref for process loop

            const ctx = audioContextRef.current;
            const source = ctx.createMediaStreamSource(stream);
            sourceRef.current = source; // Expose for Visualizer

            const processor = ctx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (!isRecordingRef.current) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBuffer = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    pcmBuffer[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }
                wsServiceRef.current.send(pcmBuffer.buffer);
            };

            source.connect(processor);
            processor.connect(ctx.destination);
        } catch (err) {
            console.error("Mic access denied", err);
        }
    };

    const stopRecording = useCallback(() => {
        setIsRecording(false);
        isRecordingRef.current = false;

        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current.onaudioprocess = null;
            processorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            // sourceRef.current = null; // Don't nullify immediately if visualizer needs it to fade out?
            // Actually visualizer depends on live source.
        }
    }, []);

    const toggleConnection = () => {
        if (isConnected) {
            wsServiceRef.current.close();
        } else {
            wsServiceRef.current.connect();
        }
    };

    return {
        isConnected,
        isRecording,
        messages,
        language,
        setLanguage,
        startRecording,
        stopRecording,
        toggleConnection,
        audioContext: audioContextRef.current,
        sourceNode: sourceRef.current
    };
};
