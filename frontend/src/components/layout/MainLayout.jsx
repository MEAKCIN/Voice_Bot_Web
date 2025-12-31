import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const MainLayout = ({ children, activeTab, setActiveTab }) => {
    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
            {/* Sidebar */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Topbar />
                <main className="flex-1 flex flex-col p-6 overflow-hidden relative">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
