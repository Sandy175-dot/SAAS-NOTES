import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const UserNotesViewer = () => {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userNotes, setUserNotes] = useState([]);
  const [noteStats, setNoteStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => {
    if (profile && profile.tenant_id) {
      fetchTenantUsers();
    }
  }, [profile]);

  const fetchTenantUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, subscription_type')
        .eq('tenant_id', profile.tenant_id)
        .order('full_name');

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserNotes = async (userId) => {
    setNotesLoading(true);
    try {
      // Fetch user's notes
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (notesError) {
        console.error('Error fetching user notes:', notesError);
        setUserNotes([]);
      } else {
        setUserNotes(notes || []);
      }

      // Fetch user's note statistics
      const { data: stats, error: statsError } = await supabase.rpc('get_user_note_stats', {
        user_id_param: userId
      });

      if (statsError) {
        console.error('Error fetching note stats:', statsError);
        setNoteStats(null);
      } else {
        setNoteStats(stats);
      }
    } catch (error) {
      console.error('Error fetching user notes:', error);
      setUserNotes([]);
      setNoteStats(null);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    fetchUserNotes(user.id);
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

  const getSubscriptionBadge = (subscriptionType) => {
    const isPremium = subscriptionType === 'premium';
    return (
      <span style={{
        background: isPremium ? '#28a745' : '#ffc107',
        color: isPremium ? 'white' : '#212529',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {isPremium ? 'Premium' : 'Standard'}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Loading users...</h3>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>User Notes Management</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        View and monitor notes created by users in your company
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        {/* Users List */}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #e1e5e9',
          height: 'fit-content'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#333' }}>Company Users</h3>
          
          {users.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center' }}>No users found</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  style={{
                    padding: '12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: selectedUser?.id === user.id ? '#e3f2fd' : '#f8f9fa',
                    borderColor: selectedUser?.id === user.id ? '#2196f3' : '#dee2e6',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {user.full_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                    {user.email}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getSubscriptionBadge(user.subscription_type)}
                    <span style={{
                      background: user.role === 'tenant_admin' ? '#dc3545' : '#6c757d',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '10px'
                    }}>
                      {user.role === 'tenant_admin' ? 'Admin' : 'User'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes Display */}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #e1e5e9'
        }}>
          {!selectedUser ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
              <h3>Select a User</h3>
              <p>Choose a user from the left panel to view their notes</p>
            </div>
          ) : (
            <>
              {/* User Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '20px',
                paddingBottom: '15px',
                borderBottom: '2px solid #e1e5e9'
              }}>
                <div>
                  <h3 style={{ margin: '0', color: '#333' }}>
                    {selectedUser.full_name}'s Notes
                  </h3>
                  <p style={{ margin: '5px 0 0 0', color: '#666' }}>
                    {selectedUser.email}
                  </p>
                </div>
                {noteStats && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {getSubscriptionBadge(selectedUser.subscription_type)}
                    <span style={{ color: '#666', fontSize: '14px' }}>
                      {noteStats.total_notes} of {noteStats.max_notes === -1 ? '∞' : noteStats.max_notes} notes
                    </span>
                    {noteStats.favorite_notes > 0 && (
                      <span style={{ color: '#666', fontSize: '14px' }}>
                        {noteStats.favorite_notes} favorites
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Notes Content */}
              {notesLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <h4>Loading notes...</h4>
                </div>
              ) : userNotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <h4>No notes found</h4>
                  <p>This user hasn't created any notes yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {userNotes.map((note) => (
                    <div
                      key={note.id}
                      style={{
                        background: '#f8f9fa',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #e1e5e9',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <h4 style={{ margin: '0', color: '#333' }}>{note.title}</h4>
                        {note.is_favorite && (
                          <span style={{ fontSize: '18px', color: '#ffc107' }}>★</span>
                        )}
                      </div>

                      {note.content && (
                        <p style={{ color: '#666', marginBottom: '15px', lineHeight: '1.5' }}>
                          {note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content}
                        </p>
                      )}

                      {note.tags && note.tags.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                          {note.tags.map((tag, index) => (
                            <span
                              key={index}
                              style={{
                                background: '#e9ecef',
                                color: '#495057',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                marginRight: '5px'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={{ fontSize: '12px', color: '#999' }}>
                        <div>Created: {formatDate(note.created_at)}</div>
                        <div>Updated: {formatDate(note.updated_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserNotesViewer;
