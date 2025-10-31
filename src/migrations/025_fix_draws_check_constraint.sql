-- Migration: Fix draws table check constraint to allow unregistered winners
-- Issue: winner_set_when_revealed constraint requires winner_user_id to be NOT NULL
-- But unregistered users have NULL user_id, causing lucky draw failures
-- Solution: Modify constraint to only require winner_name (which is always present)

-- Drop the old constraint
ALTER TABLE draws 
DROP CONSTRAINT IF EXISTS winner_set_when_revealed;

-- Add new constraint that allows NULL winner_user_id
-- When revealed=true, only winner_name must be set (winner_user_id can be NULL for unregistered users)
ALTER TABLE draws 
ADD CONSTRAINT winner_set_when_revealed 
CHECK (
  NOT revealed OR winner_name IS NOT NULL
);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT winner_set_when_revealed ON draws IS 
'When draw is revealed, winner_name must be set. winner_user_id can be NULL for unregistered/pending members.';
