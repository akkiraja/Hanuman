-- Migration: Fix minimum members constraint to allow single-member groups
-- Date: 2025-01-22
-- Description: Update bhishi_groups_total_members_check constraint to allow groups with just the creator (minimum 1 member instead of 3)
-- This enables new users to create groups without having existing contacts on the platform

-- Drop the existing constraint
ALTER TABLE bhishi_groups DROP CONSTRAINT IF EXISTS bhishi_groups_total_members_check;

-- Add the new constraint with minimum 1 member (creator only) and maximum 12 members
ALTER TABLE bhishi_groups ADD CONSTRAINT bhishi_groups_total_members_check 
  CHECK ((total_members >= 1) AND (total_members <= 12));

-- Add comment explaining the change
COMMENT ON CONSTRAINT bhishi_groups_total_members_check ON bhishi_groups IS 
  'Allows groups with minimum 1 member (creator only) up to maximum 12 members. Updated to support new users creating groups without existing contacts.';
