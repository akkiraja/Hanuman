-- Fix RLS policy to allow group members to see all members in their groups
-- This enables payment status visibility for all group members

-- Drop the restrictive policy that only allows members to see themselves
DROP POLICY IF EXISTS "Members can view group members" ON group_members;

-- Create new policy that allows members to see all members in groups they belong to
CREATE POLICY "Members can view all group members" ON group_members
  FOR SELECT
  USING (
    -- Allow if user is a member of the same group
    group_id IN (
      SELECT group_id 
      FROM group_members 
      WHERE user_id = auth.uid()
    )
  );

-- Comment explaining the policy
COMMENT ON POLICY "Members can view all group members" ON group_members IS 
'Allows group members to view all members in groups they belong to, enabling payment status visibility';
