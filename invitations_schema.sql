-- =====================================================
-- INVITATIONS SYSTEM - DATABASE SCHEMA
-- =====================================================

-- Create invitation status enum
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- =====================================================
-- INVITATIONS TABLE
-- =====================================================
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

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_invitations_tenant_id ON public.invitations(tenant_id);
CREATE INDEX idx_invitations_invited_email ON public.invitations(invited_email);
CREATE INDEX idx_invitations_status ON public.invitations(status);
CREATE INDEX idx_invitations_token ON public.invitations(invitation_token);
CREATE INDEX idx_invitations_expires_at ON public.invitations(expires_at);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

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

-- =====================================================
-- FUNCTIONS
-- =====================================================

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

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
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

-- =====================================================
-- SCHEDULED TASK (Run this periodically)
-- =====================================================
-- SELECT expire_old_invitations();
