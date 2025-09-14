-- =====================================================
-- SUBSCRIPTION UPGRADE SYSTEM - DATABASE FUNCTIONS
-- =====================================================

-- Function to upgrade user subscription (only for company admins)
CREATE OR REPLACE FUNCTION upgrade_user_subscription(
    target_user_id UUID,
    new_subscription_type subscription_type
)
RETURNS JSONB AS $$
DECLARE
    current_user_profile RECORD;
    target_user_profile RECORD;
    result JSONB;
BEGIN
    -- Get current user's profile (the one performing the upgrade)
    SELECT * INTO current_user_profile
    FROM public.profiles
    WHERE id = auth.uid();

    -- Check if current user exists and is a tenant admin
    IF current_user_profile IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    IF current_user_profile.role != 'tenant_admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only tenant admins can upgrade subscriptions');
    END IF;

    -- Get target user's profile
    SELECT * INTO target_user_profile
    FROM public.profiles
    WHERE id = target_user_id;

    -- Check if target user exists
    IF target_user_profile IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Target user not found');
    END IF;

    -- Check if target user belongs to the same tenant
    IF target_user_profile.tenant_id != current_user_profile.tenant_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Can only upgrade users in your own company');
    END IF;

    -- Check if user is already at the requested subscription level
    IF target_user_profile.subscription_type = new_subscription_type THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'User is already on ' || new_subscription_type || ' subscription'
        );
    END IF;

    -- Perform the upgrade
    UPDATE public.profiles
    SET 
        subscription_type = new_subscription_type,
        updated_at = NOW()
    WHERE id = target_user_id;

    -- Log the activity
    INSERT INTO public.activity_logs (
        user_id,
        tenant_id,
        activity_type,
        resource_type,
        resource_id,
        description,
        metadata
    ) VALUES (
        auth.uid(),
        current_user_profile.tenant_id,
        'update',
        'subscription',
        target_user_id::text,
        'Upgraded user subscription to ' || new_subscription_type,
        jsonb_build_object(
            'target_user_email', target_user_profile.email,
            'target_user_name', target_user_profile.full_name,
            'old_subscription', target_user_profile.subscription_type,
            'new_subscription', new_subscription_type,
            'action', 'upgrade'
        )
    );

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User subscription upgraded successfully',
        'old_subscription', target_user_profile.subscription_type,
        'new_subscription', new_subscription_type,
        'user_name', target_user_profile.full_name,
        'user_email', target_user_profile.email
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Database error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to downgrade user subscription (only for company admins)
CREATE OR REPLACE FUNCTION downgrade_user_subscription(
    target_user_id UUID,
    new_subscription_type subscription_type
)
RETURNS JSONB AS $$
DECLARE
    current_user_profile RECORD;
    target_user_profile RECORD;
    user_note_count INTEGER;
    result JSONB;
BEGIN
    -- Get current user's profile (the one performing the downgrade)
    SELECT * INTO current_user_profile
    FROM public.profiles
    WHERE id = auth.uid();

    -- Check if current user exists and is a tenant admin
    IF current_user_profile IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    IF current_user_profile.role != 'tenant_admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only tenant admins can downgrade subscriptions');
    END IF;

    -- Get target user's profile
    SELECT * INTO target_user_profile
    FROM public.profiles
    WHERE id = target_user_id;

    -- Check if target user exists and belongs to same tenant
    IF target_user_profile IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Target user not found');
    END IF;

    IF target_user_profile.tenant_id != current_user_profile.tenant_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Can only manage users in your own company');
    END IF;

    -- If downgrading to standard, check note count
    IF new_subscription_type = 'standard' THEN
        SELECT COUNT(*) INTO user_note_count
        FROM public.notes
        WHERE user_id = target_user_id AND deleted_at IS NULL;

        IF user_note_count > 3 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Cannot downgrade: User has ' || user_note_count || ' notes. Standard users can only have 3 notes maximum.'
            );
        END IF;
    END IF;

    -- Perform the downgrade
    UPDATE public.profiles
    SET 
        subscription_type = new_subscription_type,
        updated_at = NOW()
    WHERE id = target_user_id;

    -- Log the activity
    INSERT INTO public.activity_logs (
        user_id,
        tenant_id,
        activity_type,
        resource_type,
        resource_id,
        description,
        metadata
    ) VALUES (
        auth.uid(),
        current_user_profile.tenant_id,
        'update',
        'subscription',
        target_user_id::text,
        'Downgraded user subscription to ' || new_subscription_type,
        jsonb_build_object(
            'target_user_email', target_user_profile.email,
            'target_user_name', target_user_profile.full_name,
            'old_subscription', target_user_profile.subscription_type,
            'new_subscription', new_subscription_type,
            'note_count', user_note_count,
            'action', 'downgrade'
        )
    );

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User subscription changed successfully',
        'old_subscription', target_user_profile.subscription_type,
        'new_subscription', new_subscription_type,
        'user_name', target_user_profile.full_name,
        'user_email', target_user_profile.email
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Database error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription upgrade history for a tenant
CREATE OR REPLACE FUNCTION get_subscription_history(tenant_id_param UUID)
RETURNS TABLE (
    log_id UUID,
    performed_by_name TEXT,
    performed_by_email TEXT,
    target_user_name TEXT,
    target_user_email TEXT,
    action_type TEXT,
    old_subscription subscription_type,
    new_subscription subscription_type,
    performed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id as log_id,
        p1.full_name as performed_by_name,
        p1.email as performed_by_email,
        (al.metadata->>'target_user_name')::TEXT as target_user_name,
        (al.metadata->>'target_user_email')::TEXT as target_user_email,
        (al.metadata->>'action')::TEXT as action_type,
        (al.metadata->>'old_subscription')::subscription_type as old_subscription,
        (al.metadata->>'new_subscription')::subscription_type as new_subscription,
        al.created_at as performed_at
    FROM public.activity_logs al
    LEFT JOIN public.profiles p1 ON al.user_id = p1.id
    WHERE al.tenant_id = tenant_id_param
    AND al.resource_type = 'subscription'
    AND al.metadata->>'action' IN ('upgrade', 'downgrade')
    ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION upgrade_user_subscription(UUID, subscription_type) TO authenticated;
GRANT EXECUTE ON FUNCTION downgrade_user_subscription(UUID, subscription_type) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_history(UUID) TO authenticated;
