import React, { useRef, useEffect } from 'react';

const AudioVisualizer = ({ isRecording, audioContext, sourceNode }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null); // Keep persistent array

    useEffect(() => {
        if (!isRecording || !audioContext || !sourceNode) {
            cancelAnimationFrame(animationRef.current);
            // Draw idle line
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.beginPath();
                ctx.moveTo(0, canvas.height / 2);
                ctx.lineTo(canvas.width, canvas.height / 2);
                ctx.strokeStyle = '#334155'; // Slate-700
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            return;
        }

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        sourceNode.connect(analyser); // Connect source to visualizer
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Handle High DPI
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, rect.width, rect.height);

            const barWidth = (rect.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2; // Scale down

                const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
                gradient.addColorStop(0, '#06b6d4'); // Cyan-500
                gradient.addColorStop(1, '#3b82f6'); // Blue-500

                ctx.fillStyle = gradient;

                // Rounded bars?
                // ctx.roundRect(x, rect.height - barHeight, barWidth, barHeight, 5); // Modern API
                // Fallback rect
                ctx.fillRect(x, rect.height / 2 - barHeight / 2, barWidth, barHeight); // Center mirrored

                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            cancelAnimationFrame(animationRef.current);
            // Be careful not to disconnect source if it goes to processor too? 
            // WebAudio allows fan-out.
        };
    }, [isRecording, audioContext, sourceNode]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-32 rounded-xl bg-slate-950/50 backdrop-blur-sm border border-slate-800 shadow-inner"
            style={{ width: '100%', height: '128px' }}
        />
    );
};

export default AudioVisualizer;
