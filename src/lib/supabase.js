import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xrpozjytjjzjpajsrwqh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycG96anl0amp6anBhanNyd3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NjgzNzYsImV4cCI6MjA3MzQ0NDM3Nn0.WuwpATEpnhWIcd2B-ZWKWCSzJLoXVsn3sHSIlhz3rbc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    debug: true
  },
  global: {
    headers: {
      'X-Client-Info': 'tenant-management-app'
    }
  }
})

// Test connection immediately
supabase.auth.getSession().then(({ data, error }) => {
  console.log('Supabase connection test:', { data: !!data, error });
}).catch(err => {
  console.error('Supabase connection failed:', err);
});
