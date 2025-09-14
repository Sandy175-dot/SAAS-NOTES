import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const SignupForm = ({ onSwitchToLogin }) => {
  const [userType, setUserType] = useState('tenant'); // 'tenant' or 'user'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    phone: '',
    selectedTenantId: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableTenants, setAvailableTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  
  const { signup } = useAuth();

  // Fetch available tenants when user type is 'user'
  useEffect(() => {
    if (userType === 'user') {
      fetchAvailableTenants();
    }
  }, [userType]);

  const fetchAvailableTenants = async () => {
    setLoadingTenants(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, company_name, company_email')
        .order('company_name');

      if (error) {
        console.error('Error fetching tenants:', error);
        setError('Failed to load available companies');
      } else {
        setAvailableTenants(data || []);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setError('Failed to load available companies');
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleUserTypeChange = (type) => {
    setUserType(type);
    setError('');
    // Clear type-specific fields when switching
    if (type === 'user') {
      setFormData(prev => ({
        ...prev,
        companyName: '',
        phone: '',
        selectedTenantId: ''
      }));
    } else if (type === 'companyless') {
      setFormData(prev => ({
        ...prev,
        companyName: '',
        phone: '',
        selectedTenantId: ''
      }));
    } else {
      // Clear tenant selection when switching to tenant
      setFormData(prev => ({
        ...prev,
        selectedTenantId: ''
      }));
    }
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      return 'Please fill in all required fields';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long';
    }

    if (userType === 'tenant' && !formData.companyName) {
      return 'Company name is required for tenant accounts';
    }

    if (userType === 'user' && !formData.selectedTenantId) {
      return 'Please select a company to join';
    }

    // No additional validation needed for companyless users

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setIsLoading(false);
      return;
    }

    const result = await signup(formData, userType);
    
    if (!result.success) {
      setError(result.error);
    } else {
      // Show success message for email verification
      setError('Please check your email to verify your account before signing in.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Join our platform today</p>
        </div>

        {/* User Type Selection */}
        <div className="user-type-selector">
          <button
            type="button"
            className={`type-button ${userType === 'tenant' ? 'active' : ''}`}
            onClick={() => handleUserTypeChange('tenant')}
          >
            Company Admin
          </button>
          <button
            type="button"
            className={`type-button ${userType === 'user' ? 'active' : ''}`}
            onClick={() => handleUserTypeChange('user')}
          >
            Join Company
          </button>
          <button
            type="button"
            className={`type-button ${userType === 'companyless' ? 'active' : ''}`}
            onClick={() => handleUserTypeChange('companyless')}
          >
            Individual User
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className={`message ${error.includes('check your email') ? 'success-message' : 'error-message'}`}>
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          {userType === 'tenant' && (
            <>
              <div className="form-group">
                <label htmlFor="companyName">Company Name *</label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Enter your company name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                />
              </div>
            </>
          )}

          {userType === 'user' && (
            <div className="form-group">
              <label htmlFor="selectedTenantId">Select Company *</label>
              {loadingTenants ? (
                <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                  Loading companies...
                </div>
              ) : (
                <select
                  id="selectedTenantId"
                  name="selectedTenantId"
                  value={formData.selectedTenantId}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Choose a company to join...</option>
                  {availableTenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.company_name} ({tenant.company_email})
                    </option>
                  ))}
                </select>
              )}
              {availableTenants.length === 0 && !loadingTenants && (
                <p style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                  No companies available. Please contact an administrator or register as a Company Admin.
                </p>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password (min. 6 characters)"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : `Create ${userType === 'tenant' ? 'Company' : 'User'} Account`}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <button 
              type="button" 
              className="link-button"
              onClick={onSwitchToLogin}
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
