import React from 'react';
import { Bell, Search, User, ChevronDown, Settings as SettingsIcon, LogOut } from 'lucide-react';

const Topbar = () => {
    return (
        <div className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-50">
            {/* Search */}
            <div className="flex items-center gap-3 bg-slate-800 rounded-full px-4 py-1.5 w-96 border border-slate-700 focus-within:border-blue-500 transition-colors">
                <Search size={18} className="text-slate-400" />
                <input
                    type="text"
                    placeholder="Search conversations, logs, or settings..."
                    className="bg-transparent border-none outline-none text-slate-200 text-sm w-full placeholder:text-slate-500"
                />
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-6">
                <button className="relative text-slate-400 hover:text-white transition-colors">
                    <Bell size={20} />
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900" />
                </button>

                <div className="h-8 w-[1px] bg-slate-700" />

                <div className="relative group">
                    <button className="flex items-center gap-3 cursor-pointer outline-none">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center border border-white/10 shadow-lg">
                            <User size={16} className="text-white" />
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Admin User</p>
                            <p className="text-xs text-slate-500">SNA Consulting</p>
                        </div>
                        <ChevronDown size={14} className="text-slate-500 group-hover:text-white transition-colors group-hover:rotate-180 duration-300" />
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right z-50">
                        <div className="p-2 space-y-1">
                            <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors flex items-center gap-2">
                                <User size={14} /> Profile
                            </button>
                            <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors flex items-center gap-2">
                                <SettingsIcon size={14} /> Settings
                            </button>
                            <div className="h-[1px] bg-slate-800 my-1" />
                            <button className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2">
                                <LogOut size={14} /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Topbar;
