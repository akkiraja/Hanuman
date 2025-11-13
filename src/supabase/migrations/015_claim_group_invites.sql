-- Migration 015: Claim invited group members after registration
-- Purpose: Link non-registered members to their accounts after they register

-- Helper function to extract last 10 digits from phone number
CREATE OR REPLACE FUNCTION public.last_10_digits(p_text text)
RETURNS text AS $$
  SELECT RIGHT(REGEXP_REPLACE(COALESCE(p_text, ''), '\D', '', 'g'), 10);
$$ LANGUAGE sql IMMUTABLE;

-- Main RPC function to claim pending invites for a user
-- This function finds all group_members rows where:
--   - user_id IS NULL (not yet claimed)
--   - invited_phone matches the user's phone (last 10 digits)
-- Then updates those rows to link them to the user
CREATE OR REPLACE FUNCTION public.claim_group_invites_for_user(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_user_phone text;
  v_count integer;
BEGIN
  -- Get the user's phone number from their profile
  SELECT phone INTO v_user_phone FROM profiles WHERE id = p_user_id;

  -- Update all matching invited members
  UPDATE group_members
  SET user_id = p_user_id,
      invited_phone = NULL
  WHERE user_id IS NULL
    AND last_10_digits(invited_phone) = last_10_digits(v_user_phone);

  -- Return the count of rows updated
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_group_invites_for_user(uuid) TO authenticated;
