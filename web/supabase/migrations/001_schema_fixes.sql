-- Migration: Schema fixes for Aibond
-- Date: 2025-11-29
-- Description: Fixes for column mismatches and RLS policies

-- ============================================
-- 1. user_profiles table fixes
-- ============================================

-- Add display_name column if not exists
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add RLS policy to allow partners to view each other's profiles
CREATE POLICY "Users can view partner profile"
ON user_profiles
FOR SELECT
USING (
  id IN (
    SELECT CASE
      WHEN user1_id = auth.uid() THEN user2_id
      ELSE user1_id
    END
    FROM partnerships
    WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
    AND status = 'active'
  )
);

-- ============================================
-- 2. partner_invitations RLS policy
-- ============================================

-- Allow anyone to read invitations by invite_code (for joining)
CREATE POLICY "Anyone can read invitations by invite_code"
ON partner_invitations
FOR SELECT
USING (true);
