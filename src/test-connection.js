// Test Supabase connection and credentials
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xrpozjytjjzjpajsrwqh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycG96anl0amp6anBhanNyd3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NjgzNzYsImV4cCI6MjA3MzQ0NDM3Nn0.WuwpATEpnhWIcd2B-ZWKWCSzJLoXVsn3sHSIlhz3rbc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('_supabase_migrations')
      .select('version')
      .limit(1);
    
    if (error) {
      console.error('Connection failed:', error);
      return false;
    }
    
    console.log('✅ Connection successful');
    return true;
    
  } catch (err) {
    console.error('Network error:', err);
    return false;
  }
}

// Test if we can reach the auth endpoint
async function testAuthEndpoint() {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    console.log('Auth endpoint status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Auth settings:', data);
      return true;
    } else {
      console.error('Auth endpoint failed:', response.status, response.statusText);
      return false;
    }
  } catch (err) {
    console.error('Auth endpoint network error:', err);
    return false;
  }
}

// Run tests
testConnection();
testAuthEndpoint();
