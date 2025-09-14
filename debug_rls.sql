-- Temporarily disable RLS for testing (run this in Supabase SQL Editor)
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Test if you can insert data now
INSERT INTO public.tenants (company_name, company_email) 
VALUES ('Test Company', 'test@example.com');

-- Check if the insert worked
SELECT * FROM public.tenants WHERE company_name = 'Test Company';

-- If it works, the issue is with RLS policies
-- Re-enable RLS after testing
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
