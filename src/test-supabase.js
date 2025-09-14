import { supabase } from './lib/supabase.js';

// Test Supabase connection
async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test 1: Check if we can connect
    const { data, error } = await supabase
      .from('tenants')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Connection test failed:', error);
      return false;
    }
    
    console.log('✅ Connection successful');
    console.log('Tenants table count:', data);
    
    // Test 2: Try to insert a test tenant
    const { data: insertData, error: insertError } = await supabase
      .from('tenants')
      .insert([{
        company_name: 'Test Company ' + Date.now(),
        company_email: 'test' + Date.now() + '@example.com',
        subscription_plan: 'basic'
      }])
      .select();
    
    if (insertError) {
      console.error('Insert test failed:', insertError);
      return false;
    }
    
    console.log('✅ Insert test successful:', insertData);
    
    // Clean up test data
    if (insertData && insertData[0]) {
      await supabase
        .from('tenants')
        .delete()
        .eq('id', insertData[0].id);
      console.log('✅ Test data cleaned up');
    }
    
    return true;
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Test authentication
async function testAuth() {
  console.log('Testing authentication...');
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current session:', session ? 'Active' : 'None');
    
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user ? user.email : 'None');
    
  } catch (error) {
    console.error('Auth test error:', error);
  }
}

// Run tests
export async function runDiagnostics() {
  console.log('=== SUPABASE DIAGNOSTICS ===');
  
  await testSupabaseConnection();
  await testAuth();
  
  console.log('=== END DIAGNOSTICS ===');
}

// Auto-run if this file is executed directly
if (typeof window !== 'undefined') {
  runDiagnostics();
}
