import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Activity, Plus, Trash2, LogOut, Mic, Edit2, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = ({ user, logout }) => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ username: '', password: '', role: 'user' });
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const s = await axios.get('http://localhost:8000/api/stats');
        const u = await axios.get('http://localhost:8000/api/users');
        setStats(s.data);
        setUsers(u.data);
    };

    const verifyVoice = () => {
        // Admin typically doesn't use the bot here but let's allow navigation or simple test
        // For this prototype, we just simulated admin view
        console.log("Admin voice verify");
    };

    const addUser = async (e) => {
        e.preventDefault();
        if (!newUser.username || !newUser.password) return;
        try {
            await axios.post('http://localhost:8000/api/users', newUser);
            setNewUser({ username: '', password: '', role: 'user' });
            fetchData();
        } catch (err) {
            alert("Error adding user");
        }
    };

    const deleteUser = async (username) => {
        if (!window.confirm(`Are you sure you want to delete ${username}?`)) return;
        await axios.delete(`http://localhost:8000/api/users/${username}`);
        fetchData();
    };

    const startEdit = (user) => {
        setEditingUser(user);
        setEditForm({ ...user, password: '' }); // Don't show existing password
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            // Only send fields that mock backend expects or logic to handle partial updates
            // For this mock, we send all fields. Password only if changed (simple logic).
            const updatePayload = {
                username: editForm.username,
                role: editForm.role,
                ...(editForm.password ? { password: editForm.password } : {})
            };

            await axios.put(`http://localhost:8000/api/users/${editingUser.username}`, updatePayload);
            setEditingUser(null);
            fetchData();
        } catch (err) {
            alert("Error updating user: " + (err.response?.data?.detail || err.message));
        }
    };

    const data = [
        { name: 'Mon', usage: 40 },
        { name: 'Tue', usage: 30 },
        { name: 'Wed', usage: 60 },
        { name: 'Thu', usage: 45 },
        { name: 'Fri', usage: 80 },
        { name: 'Sat', usage: 20 },
        { name: 'Sun', usage: 15 },
    ];

    return (
        <div className="p-8 w-full max-w-7xl mx-auto">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Admin Dashboard</h1>
                    <p className="text-secondary">Welcome back, {user.username}</p>
                </div>
                <button onClick={logout} className="flex items-center gap-2 text-red-400 hover:text-red-300 transition">
                    <LogOut size={20} /> Logout
                </button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {[
                    { icon: Users, label: 'Active Users', value: stats?.active_users || 0 },
                    { icon: Activity, label: 'Server Load', value: stats?.server_load || '0%' },
                    { icon: Mic, label: 'Conversations', value: stats?.total_conversations || 0 },
                    { icon: Activity, label: 'Uptime', value: stats?.uptime || '0h' },
                ].map((item, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-panel p-6 flex flex-col items-center justify-center gap-2"
                    >
                        <item.icon className="text-purple-400 mb-2" size={32} />
                        <span className="text-3xl font-bold">{item.value}</span>
                        <span className="text-sm text-gray-400">{item.label}</span>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* User Management */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-panel p-6"
                >
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Users size={20} className="text-pink-500" /> Manage Users
                    </h2>

                    <form onSubmit={addUser} className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-6">
                        <input
                            placeholder="New Username"
                            value={newUser.username}
                            onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                            className="md:col-span-4 bg-slate-800 border-none text-white rounded p-2 outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                            placeholder="Password"
                            type="password"
                            value={newUser.password}
                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                            className="md:col-span-4 bg-slate-800 border-none text-white rounded p-2 outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <select
                            value={newUser.role}
                            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                            className="md:col-span-3 bg-slate-800 border-none text-white rounded p-2 outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button className="md:col-span-1 btn-primary flex items-center justify-center p-2 rounded hover:opacity-90 transition">
                            <Check size={20} />
                        </button>
                    </form>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {users.map(u => (
                            <div key={u.username} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg hover:bg-slate-800 transition">
                                <div>
                                    <span className="font-bold">{u.username}</span>
                                    <span className={`ml-2 text-xs px-2 py-1 rounded ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                        {u.role.toUpperCase()}
                                    </span>
                                </div>
                                {u.username !== user.username && (
                                    <div className="flex gap-2">
                                        <button onClick={() => startEdit(u)} className="text-blue-400 hover:text-blue-300 p-1">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => deleteUser(u.username)} className="text-red-400 hover:text-red-300 p-1">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Analytics Chart */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-panel p-6 flex flex-col"
                >
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-green-500" /> Weekly Usage
                    </h2>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="usage" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Edit User Modal */}
            {
                editingUser && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-panel p-6 w-full max-w-md relative"
                        >
                            <button
                                onClick={() => setEditingUser(null)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>

                            <h2 className="text-2xl font-bold mb-6">Edit User</h2>

                            <form onSubmit={handleEditSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Username</label>
                                    <input
                                        value={editForm.username}
                                        onChange={e => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                                        className="w-full bg-slate-800 border-none text-white rounded p-3 outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">New Password (leave blank to keep)</label>
                                    <input
                                        type="password"
                                        value={editForm.password}
                                        onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-800 border-none text-white rounded p-3 outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Role</label>
                                    <select
                                        value={editForm.role}
                                        onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                                        className="w-full bg-slate-800 border-none text-white rounded p-3 outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setEditingUser(null)}
                                        className="px-4 py-2 hover:bg-white/10 rounded transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary px-6 py-2"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminDashboard;
