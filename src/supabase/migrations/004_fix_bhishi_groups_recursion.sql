-- Fix infinite recursion in bhishi_groups policies
-- Remove the recursive policy that references group_members

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view groups where they are members" ON bhishi_groups;

-- Create a simpler, non-recursive policy for viewing groups
-- Users can view groups they created (already exists, but ensuring it's correct)
DROP POLICY IF EXISTS "Users can view groups they created" ON bhishi_groups;
CREATE POLICY "Users can view groups they created" ON bhishi_groups
  FOR SELECT
  USING (created_by = auth.uid());

-- For now, remove the member-based viewing policy to eliminate recursion
-- This means users can only see groups they created
-- We can add member-based viewing later with a different approach if needed

-- Ensure other policies are correct
DROP POLICY IF EXISTS "Users can create groups" ON bhishi_groups;
CREATE POLICY "Users can create groups" ON bhishi_groups
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Group creators can update their groups" ON bhishi_groups;
CREATE POLICY "Group creators can update their groups" ON bhishi_groups
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
