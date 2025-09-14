import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthContainer from './Auth/AuthContainer';

const ProtectedRoute = ({ children, requiredUserType = null }) => {
  const { user, userType, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ textAlign: 'center', color: 'white' }}>
          <h2>Loading...</h2>
          <p>Initializing authentication...</p>
          <button 
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }} 
            style={{ marginTop: '10px', padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Clear Storage & Refresh
          </button>
          <button 
            onClick={() => {
              console.log('Force showing auth forms');
              window.location.hash = '#force-auth';
              window.location.reload();
            }} 
            style={{ marginTop: '10px', marginLeft: '10px', padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Force Auth Forms
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthContainer />;
  }

  if (requiredUserType && userType !== requiredUserType) {
    return (
      <div className="auth-container">
        <div style={{ textAlign: 'center', color: 'white' }}>
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
