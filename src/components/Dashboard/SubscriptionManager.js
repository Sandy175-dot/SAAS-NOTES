import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const SubscriptionManager = () => {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingUser, setProcessingUser] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (profile && profile.tenant_id) {
      fetchTenantUsers();
      fetchSubscriptionHistory();
    }
  }, [profile]);

  const fetchTenantUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, subscription_type, created_at')
        .eq('tenant_id', profile.tenant_id)
        .order('full_name');

      if (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users');
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionHistory = async () => {
    try {
      const { data, error } = await supabase.rpc('get_subscription_history', {
        tenant_id_param: profile.tenant_id
      });

      if (error) {
        console.error('Error fetching subscription history:', error);
      } else {
        setSubscriptionHistory(data || []);
      }
    } catch (error) {
      console.error('Error fetching subscription history:', error);
    }
  };

  const handleSubscriptionChange = async (userId, newSubscriptionType, actionType) => {
    setProcessingUser(userId);
    setError('');
    setSuccess('');

    try {
      const functionName = actionType === 'upgrade' ? 'upgrade_user_subscription' : 'downgrade_user_subscription';
      
      const { data, error } = await supabase.rpc(functionName, {
        target_user_id: userId,
        new_subscription_type: newSubscriptionType
      });

      if (error) {
        setError('Failed to change subscription: ' + error.message);
      } else if (data && !data.success) {
        setError(data.error || 'Failed to change subscription');
      } else {
        setSuccess(`Successfully ${actionType}d ${data.user_name} to ${newSubscriptionType}`);
        await fetchTenantUsers();
        await fetchSubscriptionHistory();
      }
    } catch (error) {
      console.error('Error changing subscription:', error);
      setError('Failed to change subscription');
    } finally {
      setProcessingUser(null);
    }
  };

  const getSubscriptionBadge = (subscriptionType) => {
    const isPremium = subscriptionType === 'premium';
    return (
      <span style={{
        background: isPremium ? '#28a745' : '#ffc107',
        color: isPremium ? 'white' : '#212529',
        padding: '6px 12px',
        borderRadius: '16px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {isPremium ? 'Premium' : 'Standard'}
      </span>
    );
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

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Loading subscription management...</h3>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Subscription Management</h2>
          <p style={{ color: '#666', margin: '5px 0' }}>
            Manage user subscription levels for your company
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            padding: '10px 20px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </div>

      {/* Messages */}
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

      {success && (
        <div style={{ 
          background: '#d4edda', 
          color: '#155724', 
          padding: '12px', 
          borderRadius: '4px', 
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          {success}
        </div>
      )}

      {/* Subscription History */}
      {showHistory && (
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #e1e5e9',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#333' }}>Subscription History</h3>
          
          {subscriptionHistory.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
              No subscription changes recorded yet
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Action</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>User</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Change</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionHistory.map((record, index) => (
                    <tr key={record.log_id} style={{ background: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6', fontSize: '14px' }}>
                        {formatDate(record.performed_at)}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <span style={{
                          background: record.action_type === 'upgrade' ? '#28a745' : '#ffc107',
                          color: record.action_type === 'upgrade' ? 'white' : '#212529',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          textTransform: 'capitalize'
                        }}>
                          {record.action_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <div style={{ fontWeight: 'bold' }}>{record.target_user_name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{record.target_user_email}</div>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getSubscriptionBadge(record.old_subscription)}
                          <span>→</span>
                          {getSubscriptionBadge(record.new_subscription)}
                        </div>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <div style={{ fontWeight: 'bold' }}>{record.performed_by_name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{record.performed_by_email}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Users List */}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        border: '1px solid #e1e5e9'
      }}>
        <h3 style={{ marginBottom: '15px', color: '#333' }}>Company Users</h3>
        
        {users.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
            No users found in your company
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e1e5e9'
                }}
              >
                {/* User Info */}
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ margin: '0', color: '#333' }}>{user.full_name}</h4>
                      <p style={{ margin: '2px 0', color: '#666', fontSize: '14px' }}>{user.email}</p>
                    </div>
                    <span style={{
                      background: user.role === 'tenant_admin' ? '#dc3545' : '#6c757d',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {user.role === 'tenant_admin' ? 'Admin' : 'User'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', color: '#666' }}>Subscription:</span>
                    {getSubscriptionBadge(user.subscription_type)}
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    Member since: {formatDate(user.created_at)}
                  </div>
                </div>

                {/* Action Buttons */}
                {user.role !== 'tenant_admin' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {user.subscription_type === 'standard' ? (
                      <button
                        onClick={() => handleSubscriptionChange(user.id, 'premium', 'upgrade')}
                        disabled={processingUser === user.id}
                        style={{
                          flex: 1,
                          padding: '8px 16px',
                          background: processingUser === user.id ? '#6c757d' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: processingUser === user.id ? 'not-allowed' : 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        {processingUser === user.id ? 'Processing...' : 'Upgrade to Premium'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscriptionChange(user.id, 'standard', 'downgrade')}
                        disabled={processingUser === user.id}
                        style={{
                          flex: 1,
                          padding: '8px 16px',
                          background: processingUser === user.id ? '#6c757d' : '#ffc107',
                          color: processingUser === user.id ? 'white' : '#212529',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: processingUser === user.id ? 'not-allowed' : 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        {processingUser === user.id ? 'Processing...' : 'Downgrade to Standard'}
                      </button>
                    )}
                  </div>
                )}

                {user.role === 'tenant_admin' && (
                  <div style={{ 
                    background: '#e9ecef', 
                    padding: '8px 12px', 
                    borderRadius: '4px', 
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#6c757d'
                  }}>
                    Admin accounts cannot be modified
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div style={{ 
        background: '#fff3cd', 
        border: '1px solid #ffeaa7', 
        borderRadius: '8px', 
        padding: '20px', 
        marginTop: '20px'
      }}>
        <h4 style={{ color: '#856404', marginBottom: '10px' }}>Subscription Information</h4>
        <div style={{ color: '#856404', fontSize: '14px' }}>
          <p><strong>Standard Users:</strong> Can create up to 3 notes</p>
          <p><strong>Premium Users:</strong> Can create unlimited notes</p>
          <p><strong>Note:</strong> When downgrading users to Standard, they must have 3 or fewer notes</p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManager;
