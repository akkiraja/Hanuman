-- Migration: Auto-link invited members when new profile is created
-- Date: 2025-10-22
-- Purpose: Automatically link group_members.user_id when an invited user registers
--          This ensures invited members see groups on their dashboard after registration

-- 1️⃣ Create helper function to normalize phone numbers
-- Strips all non-digits and returns last 10 digits for comparison
-- This ensures phone matching works regardless of format (+91, spaces, dashes, etc.)
CREATE OR REPLACE FUNCTION public.normalize_phone_str(phone text)
RETURNS text 
LANGUAGE sql 
IMMUTABLE 
AS $$
  SELECT RIGHT(REGEXP_REPLACE(coalesce(phone, ''), '\D', '', 'g'), 10);
$$;

COMMENT ON FUNCTION public.normalize_phone_str(text) IS 
'Normalizes phone number to last 10 digits for comparison. Strips all non-digit characters.';

-- 2️⃣ Create trigger function that links invited members
-- This runs automatically after a new profile is inserted
-- It finds all group_members with matching phone (where user_id is NULL)
-- and links them by setting user_id and clearing invited_phone
CREATE OR REPLACE FUNCTION public.link_invited_members_on_profile_insert()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update all group_members where invited_phone matches the new profile's phone
  -- Only update records where user_id is NULL (invited but not yet linked)
  UPDATE public.group_members
  SET 
    user_id = NEW.id,
    invited_phone = NULL,
    updated_at = NOW()
  WHERE 
    user_id IS NULL
    AND normalize_phone_str(invited_phone) = normalize_phone_str(NEW.phone);
  
  -- Log how many records were linked
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'Linked % invited member(s) to profile % (phone: %)', 
      updated_count, NEW.id, NEW.phone;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.link_invited_members_on_profile_insert() IS 
'Automatically links invited group members when a new profile is created. Matches by normalized phone number.';

-- 3️⃣ Create trigger to run this function after every new profile creation
DROP TRIGGER IF EXISTS trg_link_invited_members ON public.profiles;

CREATE TRIGGER trg_link_invited_members
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.link_invited_members_on_profile_insert();

COMMENT ON TRIGGER trg_link_invited_members ON public.profiles IS 
'Automatically links invited group members when a user registers by matching phone numbers.';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: Auto-link invited members trigger installed';
  RAISE NOTICE '   - normalize_phone_str() function created';
  RAISE NOTICE '   - link_invited_members_on_profile_insert() function created';
  RAISE NOTICE '   - trg_link_invited_members trigger created on profiles table';
  RAISE NOTICE '   → New users will automatically be linked to their invited memberships';
END $$;
