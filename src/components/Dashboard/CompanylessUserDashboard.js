import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import NotesManager from '../Notes/NotesManager';

const CompanylessUserDashboard = () => {
  const { user, profile, logout } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingInvite, setProcessingInvite] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (profile) {
      fetchInvitations();
    }
  }, [profile]);

  const fetchInvitations = async () => {
    try {
      console.log('Fetching invitations for user:', user.email);
      
      // First check if invitations table exists and has data
      const { data: allInvitations, error: allError } = await supabase
        .from('invitations')
        .select('*')
        .limit(5);
      
      console.log('All invitations check:', { allInvitations, allError });
      
      // Then fetch user-specific invitations
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          tenants (
            id,
            company_name,
            company_email
          )
        `)
        .eq('invited_email', user.email)
        .order('created_at', { ascending: false });

      console.log('User invitations query result:', { data, error });
      console.log('Query filters - email:', user.email);

      if (error) {
        console.error('Error fetching invitations:', error);
        // Try a simpler query without joins
        const { data: simpleData, error: simpleError } = await supabase
          .from('invitations')
          .select('*')
          .eq('invited_email', user.email);
        
        console.log('Simple query result:', { simpleData, simpleError });
      } else {
        // Filter for pending and non-expired invitations in JavaScript
        const validInvitations = (data || []).filter(inv => 
          inv.status === 'pending' && new Date(inv.expires_at) > new Date()
        );
        setInvitations(validInvitations);
        console.log('Set invitations:', validInvitations);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitation = async (invitationToken, action) => {
    setProcessingInvite(invitationToken);
    
    try {
      const { data, error } = await supabase.rpc(
        action === 'accept' ? 'accept_invitation' : 'decline_invitation',
        { invitation_token_param: invitationToken }
      );

      if (error) {
        console.error(`Error ${action}ing invitation:`, error);
        alert(`Failed to ${action} invitation`);
      } else if (data.success) {
        if (action === 'accept') {
          // Refresh the page to load the new company dashboard
          window.location.reload();
        } else {
          // Remove the declined invitation from the list
          setInvitations(prev => prev.filter(inv => inv.invitation_token !== invitationToken));
        }
      } else {
        alert(data.error || `Failed to ${action} invitation`);
      }
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      alert(`Failed to ${action} invitation`);
    } finally {
      setProcessingInvite(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container">
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Welcome, {profile.full_name}!</h1>
            <p>Individual User Dashboard</p>
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
            onClick={() => setActiveTab('invitations')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'invitations' ? '#007bff' : 'transparent',
              color: activeTab === 'invitations' ? 'white' : '#666',
              cursor: 'pointer',
              fontWeight: activeTab === 'invitations' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            Invitations ({invitations.length})
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e1e5e9' }}>
                  <h3 style={{ marginBottom: '10px', color: '#333' }}>Your Profile</h3>
                  <p><strong>Name:</strong> {profile.full_name}</p>
                  <p><strong>Email:</strong> {profile.email}</p>
                  <p><strong>Status:</strong> Independent User</p>
                  <p><strong>Account Type:</strong> Individual</p>
                </div>

                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e1e5e9' }}>
                  <h3 style={{ marginBottom: '10px', color: '#333' }}>Account Status</h3>
                  <div style={{ color: '#666' }}>
                    <p>• Company: None</p>
                    <p>• Pending Invitations: {invitations.length}</p>
                    <p>• Account Created: {formatDate(profile.created_at)}</p>
                    <p>• Last Login: {formatDate(profile.last_login)}</p>
                  </div>
                </div>
              </div>

              {/* Help Section */}
              <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e1e5e9' }}>
                <h3 style={{ marginBottom: '10px', color: '#333' }}>Need Help?</h3>
                <div style={{ color: '#666' }}>
                  <p>• <strong>Joining a Company:</strong> Ask a company administrator to send you an invitation using your email address.</p>
                  <p>• <strong>Managing Invitations:</strong> Accept invitations to join companies or decline them if not interested.</p>
                  <p>• <strong>Account Settings:</strong> Update your profile information and preferences.</p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'invitations' && (
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e1e5e9', marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '15px', color: '#333' }}>Company Invitations</h3>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                Loading invitations...
              </div>
            ) : invitations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <h4>No pending invitations</h4>
                <p>You don't have any company invitations at the moment.</p>
                <p>Companies can invite you to join their team using your email address.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {invitations.map((invitation) => (
                  <div 
                    key={invitation.id}
                    style={{
                      border: '1px solid #dee2e6',
                      borderRadius: '8px',
                      padding: '20px',
                      background: '#f8f9fa'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>
                          {invitation.tenants?.company_name}
                        </h4>
                        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                          <strong>Company Email:</strong> {invitation.tenants?.company_email}
                        </p>
                        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                          <strong>Role:</strong> {invitation.role === 'tenant_user' ? 'Team Member' : invitation.role}
                        </p>
                        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                          <strong>Expires:</strong> {formatDate(invitation.expires_at)}
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleInvitation(invitation.invitation_token, 'accept')}
                          disabled={processingInvite === invitation.invitation_token}
                          style={{
                            padding: '8px 16px',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: processingInvite === invitation.invitation_token ? 'not-allowed' : 'pointer',
                            opacity: processingInvite === invitation.invitation_token ? 0.6 : 1
                          }}
                        >
                          {processingInvite === invitation.invitation_token ? 'Processing...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleInvitation(invitation.invitation_token, 'decline')}
                          disabled={processingInvite === invitation.invitation_token}
                          style={{
                            padding: '8px 16px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: processingInvite === invitation.invitation_token ? 'not-allowed' : 'pointer',
                            opacity: processingInvite === invitation.invitation_token ? 0.6 : 1
                          }}
                        >
                          {processingInvite === invitation.invitation_token ? 'Processing...' : 'Decline'}
                        </button>
                      </div>
                    </div>
                    
                    {invitation.message && (
                      <div style={{ 
                        background: 'white', 
                        padding: '10px', 
                        borderRadius: '4px', 
                        border: '1px solid #dee2e6',
                        fontSize: '14px',
                        color: '#666'
                      }}>
                        <strong>Message:</strong> {invitation.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>
          )}

          {activeTab === 'notes' && <NotesManager />}
        </div>
      </div>
    </div>
  );
};

export default CompanylessUserDashboard;
