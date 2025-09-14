-- Debug invitations issue
-- Run these queries in Supabase SQL Editor to check the data

-- 1. Check if invitations table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'invitations';

-- 2. Check if invitation_status enum exists
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'invitation_status');

-- 3. Check if user_role enum has companyless_user
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role');

-- 4. Check existing invitations
SELECT * FROM public.invitations LIMIT 10;

-- 5. Check companyless users
SELECT id, email, full_name, role, tenant_id 
FROM public.profiles 
WHERE role = 'companyless_user' AND tenant_id IS NULL;

-- 6. Check RLS policies on invitations table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'invitations';

-- 7. Test invitation query for a specific user (replace email)
SELECT 
    i.*,
    t.company_name,
    t.company_email
FROM public.invitations i
LEFT JOIN public.tenants t ON i.tenant_id = t.id
WHERE i.invited_email = 'saurabh102@gmail.com'
AND i.status = 'pending'
AND i.expires_at > NOW();

-- 8. Check if current user can see invitations (run as authenticated user)
SELECT 
    auth.uid() as current_user_id,
    auth.jwt() ->> 'email' as current_user_email;
