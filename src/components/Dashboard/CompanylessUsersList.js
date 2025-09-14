import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const CompanylessUsersList = () => {
  const { user, profile, logActivity } = useAuth();
  const [companylessUsers, setCompanylessUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch companyless users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, last_login')
        .eq('role', 'companyless_user')
        .is('tenant_id', null)
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching companyless users:', usersError);
        setError('Failed to load users');
      } else {
        setCompanylessUsers(users || []);
      }

      // Fetch existing invitations for this company
      const { data: invites, error: invitesError } = await supabase
        .from('invitations')
        .select('invited_email, status, created_at, expires_at')
        .eq('tenant_id', profile.tenant_id);

      if (invitesError) {
        console.error('Error fetching invitations:', invitesError);
      } else {
        setInvitations(invites || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getInvitationStatus = (userEmail) => {
    const invitation = invitations.find(inv => inv.invited_email === userEmail);
    if (!invitation) return null;
    
    // Check if invitation is expired
    if (invitation.status === 'pending' && new Date(invitation.expires_at) < new Date()) {
      return { status: 'expired', ...invitation };
    }
    
    return invitation;
  };

  const handleInviteUser = async (userEmail, userName) => {
    setInviting(prev => ({ ...prev, [userEmail]: true }));
    setError('');

    try {
      // Check if there's already a pending invitation
      const existingInvitation = getInvitationStatus(userEmail);
      if (existingInvitation && existingInvitation.status === 'pending') {
        setError('There is already a pending invitation for this user');
        return;
      }

      // Create invitation
      const { data, error: inviteError } = await supabase
        .from('invitations')
        .insert([{
          tenant_id: profile.tenant_id,
          invited_by: user.id,
          invited_email: userEmail,
          role: 'tenant_user',
          message: `You have been invited to join ${profile.tenants?.company_name}`
        }])
        .select()
        .single();

      if (inviteError) {
        console.error('Error creating invitation:', inviteError);
        setError('Failed to send invitation');
      } else {
        // Log activity
        if (user && profile) {
          await logActivity(
            user.id, 
            profile.tenant_id, 
            'create', 
            'invitation', 
            data.id, 
            `Invited ${userEmail} (${userName}) to join company`
          );
        }

        // Refresh data to show updated invitation status
        await fetchData();
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setError('Failed to send invitation');
    } finally {
      setInviting(prev => ({ ...prev, [userEmail]: false }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (invitation) => {
    if (!invitation) {
      return (
        <span style={{
          background: '#6c757d',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          Not Invited
        </span>
      );
    }

    const statusColors = {
      'pending': '#ffc107',
      'accepted': '#28a745',
      'declined': '#dc3545',
      'expired': '#6c757d'
    };

    return (
      <span style={{
        background: statusColors[invitation.status] || '#6c757d',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Loading companyless users...</h3>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Available Users to Invite ({companylessUsers.length})</h2>
        <button 
          onClick={fetchData}
          style={{
            padding: '8px 16px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '12px', 
          borderRadius: '4px', 
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {companylessUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <h3>No companyless users found</h3>
          <p>There are currently no individual users available to invite.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            background: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Joined</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Last Login</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Invitation Status</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {companylessUsers.map((user, index) => {
                const invitation = getInvitationStatus(user.email);
                const isInviting = inviting[user.email];
                const canInvite = !invitation || invitation.status === 'declined' || invitation.status === 'expired';
                
                return (
                  <tr 
                    key={user.id}
                    style={{ 
                      borderBottom: '1px solid #dee2e6',
                      background: index % 2 === 0 ? 'white' : '#f8f9fa'
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 'bold' }}>{user.full_name}</div>
                    </td>
                    <td style={{ padding: '12px' }}>{user.email}</td>
                    <td style={{ padding: '12px' }}>{formatDate(user.created_at)}</td>
                    <td style={{ padding: '12px' }}>{formatDate(user.last_login)}</td>
                    <td style={{ padding: '12px' }}>
                      {getStatusBadge(invitation)}
                      {invitation && invitation.status === 'pending' && (
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                          Expires: {formatDate(invitation.expires_at)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {canInvite ? (
                        <button
                          onClick={() => handleInviteUser(user.email, user.full_name)}
                          disabled={isInviting}
                          style={{
                            padding: '6px 12px',
                            background: isInviting ? '#6c757d' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isInviting ? 'not-allowed' : 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          {isInviting ? 'Inviting...' : 'Invite'}
                        </button>
                      ) : (
                        <span style={{ color: '#666', fontSize: '14px' }}>
                          {invitation.status === 'pending' ? 'Invitation Sent' : 
                           invitation.status === 'accepted' ? 'Already Joined' : 'Invitation Sent'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '20px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e1e5e9' }}>
        <h4 style={{ marginBottom: '10px', color: '#333' }}>Invitation Status Guide</h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '14px', color: '#666' }}>
          <div>• <strong>Not Invited:</strong> User hasn't been invited yet</div>
          <div>• <strong>Pending:</strong> Invitation sent, waiting for response</div>
          <div>• <strong>Accepted:</strong> User joined your company</div>
          <div>• <strong>Declined:</strong> User declined the invitation</div>
          <div>• <strong>Expired:</strong> Invitation expired after 7 days</div>
        </div>
      </div>
    </div>
  );
};

export default CompanylessUsersList;
