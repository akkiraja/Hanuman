-- Migration 011: Increase group member limit from 12 to 25
-- Date: 2025-07-26
-- Reason: Indian market requirement - some groups need more than 20 members

-- Drop the existing constraint that limits to 12 members
ALTER TABLE bhishi_groups DROP CONSTRAINT IF EXISTS bhishi_groups_total_members_check;

-- Add the new constraint with minimum 1 member (creator only) and maximum 25 members
ALTER TABLE bhishi_groups ADD CONSTRAINT bhishi_groups_total_members_check 
  CHECK ((total_members >= 1) AND (total_members <= 25));

-- Add comment explaining the change
COMMENT ON CONSTRAINT bhishi_groups_total_members_check ON bhishi_groups IS 
  'Allows groups with minimum 1 member (creator only) up to maximum 25 members. Updated for Indian market requirements where some groups exceed 20 members.';

-- Update any existing groups that might have been artificially limited
-- This is safe because we're only increasing limits, not decreasing
UPDATE bhishi_groups 
SET total_members = GREATEST(total_members, current_members)
WHERE current_members > total_members;