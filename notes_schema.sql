-- =====================================================
-- NOTES SYSTEM - DATABASE SCHEMA
-- =====================================================

-- Create subscription type enum
CREATE TYPE subscription_type AS ENUM ('standard', 'premium');

-- =====================================================
-- 1. UPDATE PROFILES TABLE - Add subscription type
-- =====================================================
ALTER TABLE public.profiles 
ADD COLUMN subscription_type subscription_type DEFAULT 'standard' NOT NULL;

-- =====================================================
-- 2. NOTES TABLE
-- =====================================================
CREATE TABLE public.notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    is_favorite BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL, -- Soft delete
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 3. INDEXES
-- =====================================================
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_created_at ON public.notes(created_at);
CREATE INDEX idx_notes_updated_at ON public.notes(updated_at);
CREATE INDEX idx_notes_deleted_at ON public.notes(deleted_at);
CREATE INDEX idx_notes_is_favorite ON public.notes(is_favorite);
CREATE INDEX idx_notes_tags ON public.notes USING GIN(tags);

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own notes
CREATE POLICY "Users can manage their own notes" ON public.notes
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 5. FUNCTIONS
-- =====================================================

-- Function to check note limit for standard users
CREATE OR REPLACE FUNCTION check_note_limit()
RETURNS TRIGGER AS $$
DECLARE
    user_subscription subscription_type;
    current_note_count INTEGER;
BEGIN
    -- Get user's subscription type
    SELECT subscription_type INTO user_subscription
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- If premium user, allow unlimited notes
    IF user_subscription = 'premium' THEN
        RETURN NEW;
    END IF;

    -- For standard users, check note count (excluding soft deleted)
    SELECT COUNT(*) INTO current_note_count
    FROM public.notes
    WHERE user_id = NEW.user_id AND deleted_at IS NULL;

    -- Allow if under limit (3 for standard users)
    IF current_note_count < 3 THEN
        RETURN NEW;
    END IF;

    -- Reject if over limit
    RAISE EXCEPTION 'Standard users can only create up to 3 notes. Upgrade to premium for unlimited notes.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user note statistics
CREATE OR REPLACE FUNCTION get_user_note_stats(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    user_subscription subscription_type;
    total_notes INTEGER;
    favorite_notes INTEGER;
    result JSONB;
BEGIN
    -- Get user's subscription type
    SELECT subscription_type INTO user_subscription
    FROM public.profiles
    WHERE id = user_id_param;

    -- Count total notes (excluding soft deleted)
    SELECT COUNT(*) INTO total_notes
    FROM public.notes
    WHERE user_id = user_id_param AND deleted_at IS NULL;

    -- Count favorite notes
    SELECT COUNT(*) INTO favorite_notes
    FROM public.notes
    WHERE user_id = user_id_param AND deleted_at IS NULL AND is_favorite = true;

    -- Build result
    result := jsonb_build_object(
        'subscription_type', user_subscription,
        'total_notes', total_notes,
        'favorite_notes', favorite_notes,
        'max_notes', CASE WHEN user_subscription = 'premium' THEN -1 ELSE 3 END,
        'can_create_more', CASE WHEN user_subscription = 'premium' THEN true ELSE total_notes < 3 END
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete note
CREATE OR REPLACE FUNCTION soft_delete_note(note_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notes
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = note_id_param AND user_id = auth.uid() AND deleted_at IS NULL;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore soft deleted note
CREATE OR REPLACE FUNCTION restore_note(note_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notes
    SET deleted_at = NULL, updated_at = NOW()
    WHERE id = note_id_param AND user_id = auth.uid() AND deleted_at IS NOT NULL;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Trigger to check note limit before insert
CREATE TRIGGER trigger_check_note_limit
    BEFORE INSERT ON public.notes
    FOR EACH ROW EXECUTE FUNCTION check_note_limit();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION update_notes_updated_at();

-- =====================================================
-- 7. SAMPLE DATA (Optional)
-- =====================================================
-- Update some existing users to premium for testing
-- UPDATE public.profiles SET subscription_type = 'premium' WHERE email = 'admin@example.com';

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================
-- Check if notes table was created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes';

-- Check subscription_type enum
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subscription_type');

-- Test note stats function
-- SELECT get_user_note_stats(auth.uid());
