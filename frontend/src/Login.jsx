import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Lock, ArrowRight } from 'lucide-react';

const Login = ({ setUser }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:8000/api/login', { username, password });
            setUser(res.data);
            if (res.data.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/bot');
            }
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen w-full relative overflow-hidden">
            {/* Background Animated Blobs */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                transition={{ duration: 20, repeat: Infinity }}
                className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600 rounded-full blur-[100px] opacity-20"
            />
            <motion.div
                animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0] }}
                transition={{ duration: 25, repeat: Infinity }}
                className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-pink-600 rounded-full blur-[100px] opacity-20"
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-10 w-[400px] z-10 flex flex-col items-center gap-6"
            >
                <h1 className="text-4xl font-bold gradient-text mb-2">Voice Bot</h1>
                <p className="text-secondary mb-4 text-center">Welcome back! Please login to continue.</p>

                <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Username"
                            className="w-full !pl-12"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full !pl-12"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                    >
                        Login <ArrowRight size={18} />
                    </motion.button>
                </form>

                <div className="text-xs text-gray-500 mt-4">
                    Hint: admin/password or user/password
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
