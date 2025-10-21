-- Add DELETE policy for bhishi_groups table
-- This allows group creators to delete their own groups

CREATE POLICY "Group creators can delete their groups" ON bhishi_groups
  FOR DELETE
  USING (created_by = auth.uid());

-- Also add DELETE policy for group_members table to ensure cascade deletion works
CREATE POLICY "Group creators can delete members" ON group_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM bhishi_groups 
      WHERE bhishi_groups.id = group_members.group_id 
      AND bhishi_groups.created_by = auth.uid()
    )
  );

-- Add DELETE policy for draw_history table
CREATE POLICY "Group creators can delete draw history" ON draw_history
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM bhishi_groups 
      WHERE bhishi_groups.id = draw_history.group_id 
      AND bhishi_groups.created_by = auth.uid()
    )
  );