import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import UserDashboard from './components/Dashboard/UserDashboard';
import TenantDashboard from './components/Dashboard/TenantDashboard';
import CompanylessUserDashboard from './components/Dashboard/CompanylessUserDashboard';

const AppContent = () => {
  const { user, userType } = useAuth();

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              {userType === 'tenant' ? <TenantDashboard /> : 
               userType === 'companyless' ? <CompanylessUserDashboard /> : 
               <UserDashboard />}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/user-dashboard" 
          element={
            <ProtectedRoute requiredUserType="user">
              <UserDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tenant-dashboard" 
          element={
            <ProtectedRoute requiredUserType="tenant">
              <TenantDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
