import React, { useState } from 'react';
import { Lock, Save, User } from 'lucide-react';

const Settings = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSave = (e) => {
        e.preventDefault();
        alert("Password updated successfully!");
    };

    return (
        <div className="max-w-4xl mx-auto w-full">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white tracking-tight">Settings</h2>
                <p className="text-slate-400 mt-1">Manage your account and security preferences</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                        SNA
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">SNA Consulting</h3>
                        <p className="text-slate-400">Pro Plan Member</p>
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-8">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Lock size={20} className="text-blue-500" />
                        Change Password
                    </h3>

                    <form onSubmit={handleSave} className="space-y-6 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Current Password</label>
                            <input
                                type="password"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">New Password</label>
                            <input
                                type="password"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Confirm New Password</label>
                            <input
                                type="password"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
                            <Save size={18} />
                            Update Password
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Settings;
