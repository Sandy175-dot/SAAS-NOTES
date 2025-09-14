-- =====================================================
-- UPDATE SCHEMA FOR INVITATIONS SYSTEM
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Add new role to existing enum
ALTER TYPE user_role ADD VALUE 'companyless_user';

-- Step 2: Create invitation status enum
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Step 3: Create invitations table
CREATE TABLE public.invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invited_email VARCHAR(255) NOT NULL,
    invited_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NULL, -- NULL if user doesn't exist yet
    invitation_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    status invitation_status DEFAULT 'pending' NOT NULL,
    role user_role DEFAULT 'tenant_user' NOT NULL,
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    declined_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Step 4: Create indexes
CREATE INDEX idx_invitations_tenant_id ON public.invitations(tenant_id);
CREATE INDEX idx_invitations_invited_email ON public.invitations(invited_email);
CREATE INDEX idx_invitations_status ON public.invitations(status);
CREATE INDEX idx_invitations_token ON public.invitations(invitation_token);
CREATE INDEX idx_invitations_expires_at ON public.invitations(expires_at);

-- Step 5: Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
-- Policy: Users can view invitations sent to their email
CREATE POLICY "Users can view their own invitations" ON public.invitations
    FOR SELECT USING (
        invited_email = auth.jwt() ->> 'email' OR
        invited_user_id = auth.uid()
    );

-- Policy: Tenant admins can manage invitations for their company
CREATE POLICY "Tenant admins can manage company invitations" ON public.invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = invitations.tenant_id
            AND p.role = 'tenant_admin'
        )
    );

-- Step 7: Create utility functions
-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
    UPDATE public.invitations
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token_param UUID)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
    result JSONB;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM public.invitations
    WHERE invitation_token = invitation_token_param
    AND status = 'pending'
    AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;

    -- Check if user email matches invitation
    IF invitation_record.invited_email != auth.jwt() ->> 'email' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email mismatch');
    END IF;

    -- Update invitation status
    UPDATE public.invitations
    SET status = 'accepted',
        accepted_at = NOW(),
        updated_at = NOW(),
        invited_user_id = auth.uid()
    WHERE id = invitation_record.id;

    -- Update user profile with tenant_id
    UPDATE public.profiles
    SET tenant_id = invitation_record.tenant_id,
        role = invitation_record.role,
        updated_at = NOW()
    WHERE id = auth.uid();

    RETURN jsonb_build_object('success', true, 'tenant_id', invitation_record.tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline invitation
CREATE OR REPLACE FUNCTION decline_invitation(invitation_token_param UUID)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM public.invitations
    WHERE invitation_token = invitation_token_param
    AND status = 'pending'
    AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;

    -- Check if user email matches invitation
    IF invitation_record.invited_email != auth.jwt() ->> 'email' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email mismatch');
    END IF;

    -- Update invitation status
    UPDATE public.invitations
    SET status = 'declined',
        declined_at = NOW(),
        updated_at = NOW(),
        invited_user_id = auth.uid()
    WHERE id = invitation_record.id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invitations_updated_at
    BEFORE UPDATE ON public.invitations
    FOR EACH ROW EXECUTE FUNCTION update_invitations_updated_at();

-- Step 9: Update profiles table to allow NULL tenant_id (if not already)
-- This allows companyless users to exist without a company
ALTER TABLE public.profiles ALTER COLUMN tenant_id DROP NOT NULL;

-- Step 10: Update the user creation trigger to handle companyless users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant_user')::user_role,
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'companyless_user' THEN NULL
      ELSE (NEW.raw_user_meta_data->>'selected_tenant_id')::UUID
    END
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification queries (optional - run these to check if everything worked)
-- SELECT * FROM pg_type WHERE typname = 'user_role';
-- SELECT * FROM pg_type WHERE typname = 'invitation_status';
-- \d public.invitations
-- SELECT * FROM public.invitations LIMIT 1;
