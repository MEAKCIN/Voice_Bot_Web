import React from 'react';
import { LayoutDashboard, Mic, BarChart, FileText, HelpCircle } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'voice-agent', icon: Mic, label: 'Voice Agent' },
        { id: 'analytics', icon: BarChart, label: 'Analytics' },
        { id: 'logs', icon: FileText, label: 'Logs' },
    ];

    return (
        <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="p-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">S</span>
                    </div>
                    <span className="text-white font-bold text-lg tracking-wide">SNA Consulting</span>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                            ${activeTab === item.id
                                ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <item.icon size={20} className={activeTab === item.id ? 'animate-pulse' : ''} />
                        <span className="font-medium text-sm">{item.label}</span>
                        {activeTab === item.id && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                        )}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors">
                    <HelpCircle size={20} />
                    <span className="font-medium text-sm">Help & Support</span>
                </button>
                <div className="mt-4 p-4 bg-slate-800 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl -mr-4 -mt-4" />
                    <p className="text-xs text-slate-400">Pro Plan Active</p>
                    <p className="text-white font-semibold text-sm mt-1">SNA Enterprise</p>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
