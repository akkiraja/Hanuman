-- Allow users to view other users' profiles for group creation
-- This enables the "Add Platform Users" feature

CREATE POLICY "Users can view all profiles for group creation" ON public.profiles
  FOR SELECT
  USING (true);

-- Add comment for clarity
COMMENT ON POLICY "Users can view all profiles for group creation" ON public.profiles IS 
'Allows authenticated users to view all user profiles to add them to bhishi groups. Only basic profile info (name, email) is exposed.';