-- Migration: Fix member_bids RLS policies for regular members
-- Date: 2025-09-01
-- Description: Add user_id field to member_bids and update RLS policies to allow group members to place bids

-- Add user_id field to member_bids table for better RLS policy support
ALTER TABLE member_bids 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update existing records to populate user_id from group_members
UPDATE member_bids 
SET user_id = gm.user_id
FROM group_members gm
WHERE gm.id = member_bids.member_id
AND member_bids.user_id IS NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Group members can only insert their own bids" ON member_bids;
DROP POLICY IF EXISTS "Group members can view all bids in their rounds" ON member_bids;
DROP POLICY IF EXISTS "Users can update their own bids" ON member_bids;

-- Create improved RLS policies

-- Allow group members to insert their own bids
CREATE POLICY "members_can_insert_bids"
ON member_bids
FOR INSERT
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  -- User must be the one placing the bid
  AND auth.uid() = user_id
  -- User must be a member of the group for this round
  AND EXISTS (
    SELECT 1 
    FROM group_members gm
    JOIN bid_rounds br ON br.group_id = gm.group_id
    WHERE br.id = member_bids.round_id
    AND gm.user_id = auth.uid()
    AND gm.id = member_bids.member_id
  )
);

-- Allow group members to view bids in their groups
CREATE POLICY "members_can_view_group_bids"
ON member_bids
FOR SELECT
USING (
  -- Group creators can see all bids in their groups
  EXISTS (
    SELECT 1
    FROM bid_rounds br
    JOIN bhishi_groups bg ON bg.id = br.group_id
    WHERE br.id = member_bids.round_id
    AND bg.created_by = auth.uid()
  )
  -- OR group members can see bids in groups they belong to
  OR EXISTS (
    SELECT 1
    FROM bid_rounds br
    JOIN group_members gm ON gm.group_id = br.group_id
    WHERE br.id = member_bids.round_id
    AND gm.user_id = auth.uid()
  )
);

-- Allow users to update their own bids
CREATE POLICY "users_can_update_own_bids"
ON member_bids
FOR UPDATE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 
    FROM group_members gm
    WHERE gm.id = member_bids.member_id
    AND gm.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 
    FROM group_members gm
    WHERE gm.id = member_bids.member_id
    AND gm.user_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_member_bids_user_id ON member_bids(user_id);
CREATE INDEX IF NOT EXISTS idx_member_bids_round_member ON member_bids(round_id, member_id);

-- Add trigger to automatically populate user_id when inserting new bids
CREATE OR REPLACE FUNCTION populate_member_bid_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If user_id is not provided, get it from group_members
  IF NEW.user_id IS NULL THEN
    SELECT gm.user_id INTO NEW.user_id
    FROM group_members gm
    WHERE gm.id = NEW.member_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_populate_member_bid_user_id
  BEFORE INSERT ON member_bids
  FOR EACH ROW
  EXECUTE FUNCTION populate_member_bid_user_id();