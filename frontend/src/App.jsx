import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import AdminDashboard from './AdminDashboard';
import VoiceBot from './VoiceBot';

function App() {
  const [user, setUser] = useState(null);

  const ProtectedRoute = ({ children, role }) => {
    if (!user) return <Navigate to="/" replace />;
    if (role && user.role !== role) {
      // Correct role redirection
      return user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/bot" replace />;
    }
    return children;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login setUser={setUser} />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard user={user} logout={() => setUser(null)} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bot"
          element={
            <ProtectedRoute role="user">
              <VoiceBot user={user} logout={() => setUser(null)} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
