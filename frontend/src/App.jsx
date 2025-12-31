import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import AdminDashboard from './AdminDashboard';
import MainLayout from './components/layout/MainLayout';

// Views
import Dashboard from './views/Dashboard';
import VoiceAgent from './views/VoiceAgent';
import Settings from './views/Settings';
import Logs from './views/Logs';
import Analytics from './views/Analytics';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // Default to Dashboard

  const ProtectedRoute = ({ children, role }) => {
    if (!user) return <Navigate to="/" replace />;
    if (role && user.role !== role) {
      if (user.role === 'admin') return <Navigate to="/admin" replace />;
      // For normal users, we no longer redirect to /bot, but to base dashboard
      return <Navigate to="/portal" replace />;
    }
    return children;
  };

  // The User Portal Wrapper that switches views based on activeTab
  const UserPortal = () => {
    return (
      <MainLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'voice-agent' && <VoiceAgent />}
        {activeTab === 'settings' && <Settings />}
        {activeTab === 'logs' && <Logs />}
        {activeTab === 'analytics' && <Analytics />}
      </MainLayout>
    );
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login setUser={setUser} />} />

        {/* Admin Route */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard user={user} logout={() => setUser(null)} />
            </ProtectedRoute>
          }
        />

        {/* User Portal Route (Replaces /bot) */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute role="user">
              <UserPortal />
            </ProtectedRoute>
          }
        />

        {/* Legacy Redirect */}
        <Route path="/bot" element={<Navigate to="/portal" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
