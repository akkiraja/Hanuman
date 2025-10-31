-- Migration 012: Increase group member limit from 25 to 40
-- This allows larger Indian bhishi groups that commonly have 35-40 members

-- Drop the existing constraint
ALTER TABLE bhishi_groups DROP CONSTRAINT IF EXISTS bhishi_groups_total_members_check;

-- Add new constraint allowing up to 40 members
ALTER TABLE bhishi_groups ADD CONSTRAINT bhishi_groups_total_members_check 
  CHECK (total_members >= 1 AND total_members <= 40);