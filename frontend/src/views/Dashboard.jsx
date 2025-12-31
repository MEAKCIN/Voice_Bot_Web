import React from 'react';
import { Activity, Shield, Zap, Check } from 'lucide-react';

const PlanCard = ({ title, price, features, recommended, isCurrent }) => (
    <div className={`relative p-8 rounded-3xl border flex flex-col h-full transition-all duration-300 ${isCurrent ? 'bg-blue-900/20 border-blue-500 shadow-2xl shadow-blue-500/10' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
        {recommended && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase shadow-lg">
                Recommended
            </div>
        )}
        {isCurrent && (
            <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold">
                Current Plan
            </div>
        )}

        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <div className="mb-6">
            <span className="text-4xl font-bold text-white">{price}</span>
            <span className="text-slate-400 text-sm">/month</span>
        </div>

        <ul className="space-y-4 mb-8 flex-1">
            {features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                </li>
            ))}
        </ul>

        <button className={`w-full py-3 rounded-xl font-bold transition-all ${isCurrent
            ? 'bg-slate-800 text-slate-400 cursor-default'
            : recommended
                ? 'bg-white text-slate-900 hover:bg-blue-50'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}>
            {isCurrent ? 'Active Plan' : 'Upgrade'}
        </button>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = React.useState(null);

    React.useEffect(() => {
        fetch('http://localhost:8000/api/stats')
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(() => { });
    }, []);

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white tracking-tight">Overview</h2>
                <p className="text-slate-400 mt-1">Manage your subscription and usage</p>
            </div>

            <div className="grid grid-cols-12 gap-8 mb-12">
                {/* Quick Stats */}
                <div className="col-span-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="text-blue-500" size={20} />
                        <span className="text-slate-400 font-medium">Monthly Usage</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats ? stats.total_hours : 0} hrs</div>
                    <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${stats ? stats.usage_percent : 0}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{stats ? stats.usage_percent : 0}% of Pro limit used</p>
                </div>
                <div className="col-span-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Zap className="text-amber-500" size={20} />
                        <span className="text-slate-400 font-medium">Tokens Generated</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats ? stats.total_tokens.toLocaleString() : 0}</div>
                    <p className="text-xs text-slate-500 mt-2">Since last billing cycle</p>
                </div>
                <div className="col-span-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="text-emerald-500" size={20} />
                        <span className="text-slate-400 font-medium">Security Status</span>
                    </div>
                    <div className="text-3xl font-bold text-white">Active</div>
                    <p className="text-xs text-emerald-500 mt-2">Enterprise encryption enabled</p>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-6">Subscription Plans</h3>
            <div className="grid grid-cols-3 gap-6 pb-12">
                <PlanCard
                    title="Free"
                    price="$0"
                    features={[
                        "Basic Voice Agent",
                        "English Only",
                        "Standard Response Time",
                        "Community Support"
                    ]}
                />
                <PlanCard
                    title="Advanced"
                    price="$29"
                    features={[
                        "Advanced Voice Models",
                        "English & Turkish",
                        "Faster Response Time",
                        "Email Support",
                        "Basic Analytics"
                    ]}
                />
                <PlanCard
                    title="Pro"
                    price="$99"
                    features={[
                        "Custom Neural Models",
                        "Multi-language Support",
                        "Real-time Latency (<500ms)",
                        "24/7 Priority Support",
                        "Advanced Analytics & Visualizer",
                        "API Access"
                    ]}
                    recommended={true}
                    isCurrent={true}
                />
            </div>
        </div>
    );
};

export default Dashboard;
