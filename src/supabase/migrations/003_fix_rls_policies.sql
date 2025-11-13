-- Fix infinite recursion in RLS policies
-- This migration removes recursive policies and creates simpler, non-recursive ones

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON group_members;
DROP POLICY IF EXISTS "Users can view draw history of their groups" ON draw_history;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON bhishi_groups;

-- Create simpler, non-recursive policies

-- Allow users to view group_members if they are the group creator
CREATE POLICY "Group creators can view all members" ON group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bhishi_groups 
      WHERE bhishi_groups.id = group_members.group_id 
      AND bhishi_groups.created_by = auth.uid()
    )
  );

-- Allow users to view group_members if they are a member (non-recursive check)
CREATE POLICY "Members can view group members" ON group_members
  FOR SELECT
  USING (group_members.user_id = auth.uid());

-- Allow users to view groups they created
CREATE POLICY "Users can view groups they created" ON bhishi_groups
  FOR SELECT
  USING (created_by = auth.uid());

-- Allow users to view groups where they are explicitly listed as members
-- This uses a direct user_id check instead of recursive group_members lookup
CREATE POLICY "Users can view groups where they are members" ON bhishi_groups
  FOR SELECT
  USING (
    id IN (
      SELECT DISTINCT group_id 
      FROM group_members 
      WHERE user_id = auth.uid()
    )
  );

-- Allow users to view draw history of groups they created
CREATE POLICY "Group creators can view draw history" ON draw_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bhishi_groups 
      WHERE bhishi_groups.id = draw_history.group_id 
      AND bhishi_groups.created_by = auth.uid()
    )
  );

-- Allow users to view draw history of groups they are members of (non-recursive)
CREATE POLICY "Members can view draw history" ON draw_history
  FOR SELECT
  USING (
    group_id IN (
      SELECT DISTINCT group_id 
      FROM group_members 
      WHERE user_id = auth.uid()
    )
  );

-- Ensure RLS is enabled on all tables
ALTER TABLE bhishi_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;