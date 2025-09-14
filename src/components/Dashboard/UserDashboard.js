import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import NotesManager from '../Notes/NotesManager';

const UserDashboard = () => {
  const { user, profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container">
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Welcome, {user.name}!</h1>
            <p>User Dashboard</p>
          </div>
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '2px solid #e1e5e9', 
          marginBottom: '20px',
          background: 'white',
          borderRadius: '8px 8px 0 0',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'dashboard' ? '#007bff' : 'transparent',
              color: activeTab === 'dashboard' ? 'white' : '#666',
              cursor: 'pointer',
              fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'notes' ? '#007bff' : 'transparent',
              color: activeTab === 'notes' ? 'white' : '#666',
              cursor: 'pointer',
              fontWeight: activeTab === 'notes' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            My Notes
          </button>
        </div>

        <div className="dashboard-content">
          {activeTab === 'dashboard' && (
            <>
              {/* Welcome Section */}
              <div style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white', 
                padding: '30px', 
                borderRadius: '12px', 
                marginBottom: '30px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: '300' }}>
                  Welcome back, {profile?.full_name || user.name}!
                </h2>
                <p style={{ margin: '0', opacity: '0.9', fontSize: '16px' }}>
                  {profile?.subscription_type === 'premium' ? 'Premium Account' : 'Standard Account'} - Manage your notes and profile
                </p>
              </div>

              {/* Quick Actions */}
              <div style={{ 
                background: 'white', 
                padding: '25px', 
                borderRadius: '12px', 
                border: '1px solid #e1e5e9',
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                marginBottom: '30px'
              }}>
                <h3 style={{ marginBottom: '20px', color: '#1f2937', fontSize: '20px', fontWeight: '600' }}>
                  Quick Actions
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <button 
                    onClick={() => setActiveTab('notes')}
                    style={{
                      padding: '15px 20px',
                      background: '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#4338ca'}
                    onMouseOut={(e) => e.target.style.background = '#4f46e5'}
                  >
                    📝 Manage My Notes
                  </button>
                </div>
              </div>

              {/* Profile Information */}
              <div style={{ 
                background: 'white', 
                padding: '25px', 
                borderRadius: '12px', 
                border: '1px solid #e1e5e9',
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)'
              }}>
                <h3 style={{ marginBottom: '20px', color: '#1f2937', fontSize: '20px', fontWeight: '600' }}>
                  Profile Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>Full Name</div>
                    <div style={{ color: '#1f2937', fontSize: '16px', fontWeight: '500' }}>
                      {profile?.full_name || user.name}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>Email Address</div>
                    <div style={{ color: '#1f2937', fontSize: '16px', fontWeight: '500' }}>
                      {profile?.email || user.email}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>Account Type</div>
                    <div style={{ 
                      color: profile?.subscription_type === 'premium' ? '#059669' : '#dc2626', 
                      fontSize: '16px', 
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {profile?.subscription_type === 'premium' ? '⭐ Premium User' : '👤 Standard User'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>User ID</div>
                    <div style={{ color: '#6b7280', fontSize: '12px', fontFamily: 'monospace' }}>
                      {user.id}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'notes' && <NotesManager />}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
