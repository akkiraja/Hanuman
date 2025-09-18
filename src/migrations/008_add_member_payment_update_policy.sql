-- Migration 008: Add RLS policy for members to update their own payment status
-- This allows members to mark their own payments as completed

-- Allow members to update their own payment status
CREATE POLICY "Members can update their own payment status" ON group_members
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add comment for clarity
COMMENT ON POLICY "Members can update their own payment status" ON group_members IS 
'Allows group members to update their own contribution_status and last_payment_date fields';
