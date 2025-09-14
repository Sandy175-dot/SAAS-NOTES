import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeoutId;
    
    // Force loading to false after 5 seconds
    timeoutId = setTimeout(() => {
      console.log('Authentication timeout - forcing loading to false');
      setLoading(false);
    }, 5000);

    // Get initial session
    const getSession = async () => {
      try {
        console.log('Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }
        
        if (session) {
          console.log('Session found:', session.user.email);
          await handleUserSession(session.user);
        } else {
          console.log('No session found');
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        setLoading(true);
        await handleUserSession(session.user);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setUserType(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleUserSession = async (authUser) => {
    try {
      console.log('Handling user session for:', authUser.email);
      
      // Get user profile
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          *,
          tenants (
            id,
            company_name,
            company_email,
            subscription_plan,
            max_users
          )
        `)
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating one...');
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || 'User',
              role: authUser.user_metadata?.role || 'tenant_user'
            }])
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            // Clear the session if profile creation fails
            await supabase.auth.signOut();
            return;
          }

          console.log('Profile created successfully:', newProfile);
          setUser(authUser);
          setProfile(newProfile);
          setUserType(newProfile.role === 'tenant_admin' ? 'tenant' : 'user');
          return;
        }
        
        // For other errors, clear the session
        console.log('Clearing session due to profile error');
        await supabase.auth.signOut();
        return;
      }

      console.log('Profile found:', profileData);
      setUser(authUser);
      setProfile(profileData);
      setUserType(profileData.role === 'tenant_admin' ? 'tenant' : 
                  profileData.role === 'companyless_user' ? 'companyless' : 'user');

      // Log login activity
      if (profileData.tenant_id) {
        await logActivity(authUser.id, profileData.tenant_id, 'login', null, null, 'User logged in');
      }
    } catch (error) {
      console.error('Error handling user session:', error);
      // Clear session on any error
      await supabase.auth.signOut();
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      console.log('Attempting login with:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
      }

      console.log('Login successful:', data);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login exception:', error);
      return { success: false, error: 'Login failed: ' + error.message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (formData, type) => {
    try {
      setLoading(true);
      
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            role: type === 'tenant' ? 'tenant_admin' : type === 'companyless' ? 'companyless_user' : 'tenant_user',
            company_name: formData.companyName || null,
            phone: formData.phone || null,
            selected_tenant_id: formData.selectedTenantId || null
          }
        }
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      // If user creation was successful and it's a tenant signup, create tenant
      if (authData.user && type === 'tenant') {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .insert([{
            company_name: formData.companyName,
            company_email: formData.email,
            company_phone: formData.phone || null,
            created_by: authData.user.id
          }])
          .select()
          .single();

        if (tenantError) {
          console.error('Tenant creation error:', tenantError);
          // Don't fail the signup if tenant creation fails, just log it
        } else {
          // Update the user's profile with tenant_id
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ tenant_id: tenantData.id })
            .eq('id', authData.user.id);
          
          if (profileError) {
            console.error('Profile update error:', profileError);
          }
        }
      }

      // If it's a user signup and they selected a tenant, update their profile
      if (authData.user && type === 'user' && formData.selectedTenantId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ tenant_id: formData.selectedTenantId })
          .eq('id', authData.user.id);
        
        if (profileError) {
          console.error('Profile update error for user:', profileError);
        }
      }

      return { success: true, user: authData.user };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Log logout activity before signing out
      if (user && profile) {
        await logActivity(user.id, profile.tenant_id, 'logout', null, null, 'User logged out');
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const logActivity = async (userId, tenantId, activityType, resourceType = null, resourceId = null, description = '') => {
    try {
      const { error } = await supabase.rpc('log_activity', {
        p_user_id: userId,
        p_tenant_id: tenantId,
        p_activity_type: activityType,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_description: description,
        p_metadata: {}
      });

      if (error) {
        console.error('Error logging activity:', error);
      }
    } catch (error) {
      console.error('Error in logActivity:', error);
    }
  };

  const value = {
    user,
    profile,
    userType,
    login,
    signup,
    logout,
    loading,
    logActivity
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
