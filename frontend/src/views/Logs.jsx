import React from 'react';
import { Terminal, Clock, AlertCircle, Info } from 'lucide-react';

const Logs = () => {
    const logs = [
        { id: 1, type: 'info', msg: 'System initialized successfully', time: '10:00:01' },
        { id: 2, type: 'info', msg: 'Connected to WebSocket server', time: '10:00:02' },
        { id: 3, type: 'info', msg: 'Loaded Whisper model [large-v3-turbo]', time: '10:00:05' },
        { id: 4, type: 'warning', msg: 'Latency spike detected [210ms]', time: '10:05:23' },
        { id: 5, type: 'info', msg: 'User session started #SNA-8291', time: '10:10:00' },
    ];

    return (
        <div className="h-full flex flex-col">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white tracking-tight">System Logs</h2>
                <p className="text-slate-400 mt-1">Real-time system events and diagnostics</p>
            </div>

            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl font-mono text-sm relative group">
                <div className="absolute top-0 left-0 w-full h-10 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-2">
                    <Terminal size={14} className="text-slate-500" />
                    <span className="text-slate-500">console.log</span>
                </div>
                <div className="p-6 pt-14 space-y-2 h-full overflow-y-auto">
                    {logs.map(log => (
                        <div key={log.id} className="flex gap-4 hover:bg-slate-900/50 p-1 rounded transition-colors">
                            <span className="text-slate-600 shrink-0">{log.time}</span>
                            <span className={`shrink-0 ${log.type === 'info' ? 'text-blue-500' : 'text-amber-500'}`}>
                                {log.type === 'info' ? <Info size={14} /> : <AlertCircle size={14} />}
                            </span>
                            <span className="text-slate-300">{log.msg}</span>
                        </div>
                    ))}
                    <div className="animate-pulse text-slate-600 mt-4">_</div>
                </div>
            </div>
        </div>
    );
};

export default Logs;
