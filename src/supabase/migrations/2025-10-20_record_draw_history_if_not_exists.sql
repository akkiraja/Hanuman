-- Atomic function to insert draw_history only if not exists (avoids 23505 duplicates)
-- This prevents race conditions when multiple clients try to finalize the same draw
CREATE OR REPLACE FUNCTION public.record_draw_history_if_not_exists(
  p_group_id uuid,
  p_draw_id uuid,
  p_round int,
  p_winner_member_id uuid,
  p_winner_id uuid,
  p_winner_name text,
  p_amount numeric
) RETURNS SETOF draw_history AS $$
BEGIN
  -- Try to insert only if no record exists for this group+round combination
  -- This makes the operation idempotent - safe to call multiple times
  RETURN QUERY
  INSERT INTO draw_history(group_id, draw_id, round, winner_member_id, winner_id, winner_name, amount, status)
  SELECT p_group_id, p_draw_id, p_round, p_winner_member_id, p_winner_id, p_winner_name, p_amount, 'completed'
  WHERE NOT EXISTS (
    SELECT 1 FROM draw_history WHERE group_id = p_group_id AND round = p_round
  )
  ON CONFLICT (group_id, round) DO NOTHING
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.record_draw_history_if_not_exists TO authenticated;
