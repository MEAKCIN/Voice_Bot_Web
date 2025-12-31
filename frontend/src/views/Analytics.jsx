import React, { useEffect, useState } from 'react';
import anime from 'animejs';
import { Activity, Clock, Zap, MessageSquare } from 'lucide-react';

const Analytics = () => {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetch('http://localhost:8000/api/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                // Animate bars on load
                anime({
                    targets: '.stat-bar',
                    width: el => el.dataset.width,
                    easing: 'easeOutExpo',
                    duration: 1000,
                    delay: anime.stagger(100)
                });
            })
            .catch(err => console.error("Failed to fetch stats", err));
    }, []);

    if (!stats) return <div className="text-white">Loading Analytics...</div>;

    return (
        <div className="h-full flex flex-col overflow-y-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white tracking-tight">Analytics Engine</h2>
                <p className="text-slate-400 mt-1">Deep dive into usage metrics and performance</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex items-center gap-2 mb-2 text-blue-400">
                        <Zap size={18} /> <span className="text-sm font-bold uppercase tracking-wider">Total Tokens</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.total_tokens.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex items-center gap-2 mb-2 text-emerald-400">
                        <Clock size={18} /> <span className="text-sm font-bold uppercase tracking-wider">Total Duration</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.total_hours} hr</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex items-center gap-2 mb-2 text-amber-400">
                        <MessageSquare size={18} /> <span className="text-sm font-bold uppercase tracking-wider">Interactions</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.interactions.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex items-center gap-2 mb-2 text-indigo-400">
                        <Activity size={18} /> <span className="text-sm font-bold uppercase tracking-wider">Efficiency</span>
                    </div>
                    <div className="text-3xl font-bold text-white">98%</div>
                </div>
            </div>

            {/* Session History & Graph Placeholder */}
            <div className="grid grid-cols-12 gap-8 mb-8">
                <div className="col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6">Recent Sessions</h3>
                    <div className="space-y-4">
                        {stats.recent_sessions.slice().reverse().slice(0, 5).map((session, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                                <div>
                                    <div className="text-white font-medium">Session {new Date(session.timestamp).toLocaleTimeString()}</div>
                                    <div className="text-xs text-slate-500">{new Date(session.timestamp).toLocaleDateString()}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-blue-400 font-bold">{session.tokens} tokens</div>
                                    <div className="text-xs text-slate-500">{session.duration.toFixed(1)}s duration</div>
                                </div>
                            </div>
                        ))}
                        {stats.recent_sessions.length === 0 && <div className="text-slate-500 text-center py-4">No sessions recorded yet.</div>}
                    </div>
                </div>

                <div className="col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6">Token Usage Distribution</h3>
                    {/* CSS Bar Chart */}
                    <div className="space-y-4 h-64 flex flex-col justify-end pb-4">
                        {[65, 40, 85, 30, 95].map((h, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-xs text-slate-500 w-8">Model {i + 1}</span>
                                <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="stat-bar h-full bg-blue-500 rounded-full"
                                        style={{ width: 0 }}
                                        data-width={`${h}%`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
