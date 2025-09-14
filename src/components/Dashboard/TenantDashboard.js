import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import RealTimeLogger from '../RealTimeLogger';
import UserList from './UserList';
import InviteUsers from './InviteUsers';
import CompanylessUsersList from './CompanylessUsersList';
import UserNotesViewer from '../Notes/UserNotesViewer';
import SubscriptionManager from './SubscriptionManager';

const TenantDashboard = () => {
  const { user, profile, logout, logActivity } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    createdDate: null,
    lastLogin: null
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (profile) {
      fetchDashboardStats();
    }
  }, [profile]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch total users in tenant
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id);

      // Fetch active sessions
      const { count: sessionCount } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true);

      // Fetch tenant creation date
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('created_at')
        .eq('id', profile.tenant_id)
        .single();

      setStats({
        totalUsers: userCount || 0,
        activeSessions: sessionCount || 0,
        createdDate: tenantData?.created_at,
        lastLogin: profile.last_login
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = async (action, description) => {
    if (user && profile) {
      await logActivity(user.id, profile.tenant_id, 'view', 'dashboard', action, description);
    }
    
    // Handle specific actions
    if (action === 'manage_users') {
      setActiveTab('users');
    } else if (action === 'add_user') {
      setActiveTab('invite');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (!profile) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Loading profile...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Welcome, {profile.full_name}!</h1>
            <p>Company Dashboard - {profile.tenants?.company_name}</p>
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
            onClick={() => setActiveTab('users')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'users' ? '#007bff' : 'transparent',
              color: activeTab === 'users' ? 'white' : '#666',
              cursor: 'pointer',
              fontWeight: activeTab === 'users' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            Users ({stats.totalUsers})
          </button>
          <button
            onClick={() => setActiveTab('available')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'available' ? '#007bff' : 'transparent',
              color: activeTab === 'available' ? 'white' : '#666',
              cursor: 'pointer',
              fontWeight: activeTab === 'available' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            Invite Users
          </button>
          <button
            onClick={() => setActiveTab('user-notes')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'user-notes' ? '#007bff' : 'transparent',
              color: activeTab === 'user-notes' ? 'white' : '#666',
              cursor: 'pointer',
              fontWeight: activeTab === 'user-notes' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            User Notes
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'subscriptions' ? '#007bff' : 'transparent',
              color: activeTab === 'subscriptions' ? 'white' : '#666',
              cursor: 'pointer',
              fontWeight: activeTab === 'subscriptions' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            Subscriptions
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
                  {profile.tenants?.company_name}
                </h2>
                <p style={{ margin: '0', opacity: '0.9', fontSize: '16px' }}>
                  Company Dashboard - Manage your team and resources
                </p>
              </div>

              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ 
                  background: 'white', 
                  padding: '25px', 
                  borderRadius: '12px', 
                  border: '1px solid #e1e5e9',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4f46e5', marginBottom: '8px' }}>
                    {loading ? '...' : stats.totalUsers}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>Total Users</div>
                </div>

                <div style={{ 
                  background: 'white', 
                  padding: '25px', 
                  borderRadius: '12px', 
                  border: '1px solid #e1e5e9',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#059669', marginBottom: '8px' }}>
                    {loading ? '...' : stats.activeSessions}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>Active Sessions</div>
                </div>

                <div style={{ 
                  background: 'white', 
                  padding: '25px', 
                  borderRadius: '12px', 
                  border: '1px solid #e1e5e9',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>
                    {formatDate(stats.createdDate)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>Company Created</div>
                </div>
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
                    onClick={() => setActiveTab('users')}
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
                    👥 Manage Users
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('available')}
                    style={{
                      padding: '15px 20px',
                      background: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#047857'}
                    onMouseOut={(e) => e.target.style.background = '#059669'}
                  >
                    ✉️ Invite Users
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('subscriptions')}
                    style={{
                      padding: '15px 20px',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#b91c1c'}
                    onMouseOut={(e) => e.target.style.background = '#dc2626'}
                  >
                    ⭐ Manage Subscriptions
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('user-notes')}
                    style={{
                      padding: '15px 20px',
                      background: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#6d28d9'}
                    onMouseOut={(e) => e.target.style.background = '#7c3aed'}
                  >
                    📝 View User Notes
                  </button>
                </div>
              </div>

              {/* Company Information */}
              <div style={{ 
                background: 'white', 
                padding: '25px', 
                borderRadius: '12px', 
                border: '1px solid #e1e5e9',
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)'
              }}>
                <h3 style={{ marginBottom: '20px', color: '#1f2937', fontSize: '20px', fontWeight: '600' }}>
                  Company Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>Company Name</div>
                    <div style={{ color: '#1f2937', fontSize: '16px', fontWeight: '500' }}>
                      {profile.tenants?.company_name}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>Admin Name</div>
                    <div style={{ color: '#1f2937', fontSize: '16px', fontWeight: '500' }}>
                      {profile.full_name}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>Email</div>
                    <div style={{ color: '#1f2937', fontSize: '16px', fontWeight: '500' }}>
                      {profile.email}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'users' && <UserList />}
          
          
          {activeTab === 'available' && <CompanylessUsersList />}
          
          {activeTab === 'user-notes' && <UserNotesViewer />}
          
          {activeTab === 'subscriptions' && <SubscriptionManager />}

          {activeTab === 'dashboard' && (
            <div style={{ marginTop: '20px' }}>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;
