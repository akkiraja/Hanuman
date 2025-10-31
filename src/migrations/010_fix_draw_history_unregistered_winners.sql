-- Fix draw_history to support unregistered (pending) winners
-- This allows lucky draws to complete successfully even when winner has no user_id
-- Created: 2025-10-18

-- Step 1: Add winner_member_id column (references group_members.id)
-- This becomes the primary winner reference since all winners are in group_members
ALTER TABLE draw_history
ADD COLUMN IF NOT EXISTS winner_member_id UUID;

-- Step 2: Add foreign key constraint to group_members
ALTER TABLE draw_history
ADD CONSTRAINT fk_draw_history_winner_member
FOREIGN KEY (winner_member_id) REFERENCES group_members(id)
ON DELETE SET NULL;

-- Step 3: Make winner_id (user_id) nullable
-- This allows unregistered/pending members (no user_id) to win
ALTER TABLE draw_history
ALTER COLUMN winner_id DROP NOT NULL;

-- Step 4: Add comment explaining the schema
COMMENT ON COLUMN draw_history.winner_member_id IS 'Primary winner reference - links to group_members.id (always present)';
COMMENT ON COLUMN draw_history.winner_id IS 'Optional user_id - only present for registered members, null for pending members';

-- Step 5: Backfill winner_member_id for existing records (if any exist)
-- Find the member_id based on winner_id (user_id) match
UPDATE draw_history dh
SET winner_member_id = (
  SELECT gm.id 
  FROM group_members gm 
  WHERE gm.group_id = dh.group_id 
    AND gm.user_id = dh.winner_id
  LIMIT 1
)
WHERE winner_member_id IS NULL 
  AND winner_id IS NOT NULL;

-- Step 6: Create index for efficient winner lookups
CREATE INDEX IF NOT EXISTS idx_draw_history_winner_member_id 
ON draw_history(winner_member_id);

-- Step 7: Add check constraint (at least one winner reference must exist)
ALTER TABLE draw_history
ADD CONSTRAINT check_draw_history_has_winner
CHECK (winner_member_id IS NOT NULL OR winner_id IS NOT NULL);

-- Migration complete
-- Now draw_history can handle both registered and unregistered winners
