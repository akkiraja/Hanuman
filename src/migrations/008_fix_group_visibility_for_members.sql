-- Fix group visibility: Allow users to see groups they created OR are members of
-- This replaces the restrictive policy that only allowed creators to see groups

-- Drop the existing restrictive policy
DROP POLICY "Users can view groups they created" ON bhishi_groups;

-- Create new policy that allows both creators and members to view groups
CREATE POLICY "Users can view groups they created or are members of" ON bhishi_groups
  FOR SELECT
  USING (
    created_by = auth.uid() 
    OR 
    id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid()
    )
  );