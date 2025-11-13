-- Backfill Script: Link existing invited members to registered profiles
-- Date: 2025-10-22
-- Purpose: One-time script to link historical invited members who registered before the trigger was created
-- 
-- Run this ONCE in Supabase SQL Editor after the migration is deployed
-- This will make all existing invited members' groups visible on their dashboards

-- Step 1: Show preview of what will be linked (dry-run)
-- Uncomment to see which records will be updated before running the actual update
-- SELECT 
--   gm.id as member_id,
--   gm.name as member_name,
--   gm.invited_phone,
--   gm.group_id,
--   p.id as profile_id,
--   p.phone as profile_phone
-- FROM group_members gm
-- JOIN profiles p ON RIGHT(REGEXP_REPLACE(gm.invited_phone, '\D', '', 'g'), 10) 
--                  = RIGHT(REGEXP_REPLACE(p.phone, '\D', '', 'g'), 10)
-- WHERE gm.user_id IS NULL
--   AND gm.invited_phone IS NOT NULL;

-- Step 2: Perform the actual update
-- Links all invited members to their profiles based on normalized phone matching
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update group_members with matching profiles
  UPDATE group_members gm
  SET 
    user_id = p.id,
    invited_phone = NULL,
    updated_at = NOW()
  FROM profiles p
  WHERE 
    gm.user_id IS NULL
    AND gm.invited_phone IS NOT NULL
    AND RIGHT(REGEXP_REPLACE(gm.invited_phone, '\D', '', 'g'), 10) 
      = RIGHT(REGEXP_REPLACE(p.phone, '\D', '', 'g'), 10);
  
  -- Get count of updated records
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log the result
  RAISE NOTICE '✅ Backfill completed: Linked % existing invited member(s) to their profiles', updated_count;
  
  IF updated_count = 0 THEN
    RAISE NOTICE 'ℹ️  No unlinked invited members found - all members are already linked';
  ELSE
    RAISE NOTICE '→ These members will now see their groups on the dashboard';
  END IF;
END $$;

-- Step 3: Verify the results
-- Show summary of group members by type
SELECT 
  CASE 
    WHEN user_id IS NOT NULL THEN 'Registered (linked)'
    WHEN invited_phone IS NOT NULL THEN 'Invited (not yet registered)'
    ELSE 'Unknown status'
  END as member_type,
  COUNT(*) as count
FROM group_members
GROUP BY 
  CASE 
    WHEN user_id IS NOT NULL THEN 'Registered (linked)'
    WHEN invited_phone IS NOT NULL THEN 'Invited (not yet registered)'
    ELSE 'Unknown status'
  END
ORDER BY count DESC;
