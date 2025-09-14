-- Fix RLS policies to allow user registration and data insertion
-- Run this in your Supabase SQL Editor

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Tenant admins can update their tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Tenant admins can manage profiles in their tenant" ON public.profiles;

-- Create more permissive policies for tenants table
CREATE POLICY "Allow tenant creation during signup" ON public.tenants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own tenant" ON public.tenants
    FOR SELECT USING (
        created_by = auth.uid() OR
        id IN (
            SELECT tenant_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Tenant admins can update their tenant" ON public.tenants
    FOR UPDATE USING (
        created_by = auth.uid() OR
        id IN (
            SELECT tenant_id FROM public.profiles 
            WHERE id = auth.uid() AND role = 'tenant_admin'
        )
    );

-- Create more permissive policies for profiles table
CREATE POLICY "Allow profile creation during signup" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their tenant" ON public.profiles
    FOR SELECT USING (
        id = auth.uid() OR
        tenant_id IN (
            SELECT tenant_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Allow activity logs insertion
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
CREATE POLICY "Allow activity log insertion" ON public.activity_logs
    FOR INSERT WITH CHECK (true);

-- Test the setup
SELECT 'RLS policies updated successfully' as status;
