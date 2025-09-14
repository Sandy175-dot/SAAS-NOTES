import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const InviteUsers = () => {
  const { user, profile, logActivity } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    role: 'tenant_user',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Check if user is already in the company
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('email', formData.email)
        .single();

      if (existingProfile && existingProfile.tenant_id === profile.tenant_id) {
        setError('This user is already a member of your company');
        setLoading(false);
        return;
      }

      // Check if there's already a pending invitation
      const { data: existingInvitation } = await supabase
        .from('invitations')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('invited_email', formData.email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingInvitation) {
        setError('There is already a pending invitation for this email address');
        setLoading(false);
        return;
      }

      // Get the user ID if they exist
      let invitedUserId = null;
      if (existingProfile) {
        invitedUserId = existingProfile.id;
      }

      // Create invitation
      const { data, error: inviteError } = await supabase
        .from('invitations')
        .insert([{
          tenant_id: profile.tenant_id,
          invited_by: user.id,
          invited_email: formData.email,
          invited_user_id: invitedUserId,
          role: formData.role,
          message: formData.message || null
        }])
        .select()
        .single();

      if (inviteError) {
        console.error('Error creating invitation:', inviteError);
        setError('Failed to send invitation. Please try again.');
      } else {
        setSuccess(`Invitation sent successfully to ${formData.email}`);
        
        // Log activity
        if (user && profile) {
          await logActivity(
            user.id, 
            profile.tenant_id, 
            'create', 
            'invitation', 
            data.id, 
            `Invited ${formData.email} to join company`
          );
        }

        // Reset form
        setFormData({
          email: '',
          role: 'tenant_user',
          message: ''
        });
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '20px' }}>Invite Users to Your Company</h2>
        
        <form onSubmit={handleSubmit} style={{ background: 'white', padding: '30px', borderRadius: '8px', border: '1px solid #e1e5e9' }}>
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

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter user's email address"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="role" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Role *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                backgroundColor: 'white'
              }}
            >
              <option value="tenant_user">Team Member</option>
              <option value="tenant_admin">Company Admin</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="message" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Personal Message (Optional)
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Add a personal message to the invitation..."
              rows="4"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                resize: 'vertical'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Sending Invitation...' : 'Send Invitation'}
          </button>
        </form>

        <div style={{ marginTop: '30px', background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e1e5e9' }}>
          <h3 style={{ marginBottom: '15px', color: '#333' }}>How Invitations Work</h3>
          <div style={{ color: '#666', fontSize: '14px' }}>
            <p>• <strong>Existing Users:</strong> If the email belongs to a registered user, they'll see the invitation in their dashboard immediately.</p>
            <p>• <strong>New Users:</strong> If the email doesn't belong to a registered user, they can sign up and will see the invitation after registration.</p>
            <p>• <strong>Expiration:</strong> Invitations expire after 7 days for security reasons.</p>
            <p>• <strong>Roles:</strong> Team Members have standard access, while Company Admins can manage users and settings.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteUsers;
