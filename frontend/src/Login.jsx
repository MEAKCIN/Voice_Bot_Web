import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';

const Login = ({ setUser }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

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
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen w-full relative overflow-hidden">
            {/* 
               Global background handles the mesh gradient. 
               We can add a subtle centered glow here if we want extra focus 
            */}

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="glass-panel p-10 w-full max-w-[420px] z-10 flex flex-col items-center gap-8 shadow-2xl shadow-violet-900/20"
            >
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold gradient-text">Voice Bot</h1>
                    <p className="text-slate-400 font-medium tracking-wide text-sm">SECURE ACCESS</p>
                </div>

                <form onSubmit={handleLogin} className="w-full flex flex-col gap-5">
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Username"
                            className="!pl-12 !bg-slate-900/50 focus:!bg-slate-900/80"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={20} />
                        <input
                            type="password"
                            placeholder="Password"
                            className="!pl-12 !bg-slate-900/50 focus:!bg-slate-900/80"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium"
                        >
                            {error}
                        </motion.div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(124, 58, 237, 0.3)" }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isLoading}
                        className={`btn-primary w-full flex items-center justify-center gap-2 mt-2 h-12 text-lg ${isLoading ? 'opacity-80 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <>Enter System <ArrowRight size={20} /></>}
                    </motion.button>
                </form>

                <div className="text-xs text-slate-500 font-medium bg-slate-950/30 px-4 py-2 rounded-full border border-white/5">
                    Hint: admin/password or user/password
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
