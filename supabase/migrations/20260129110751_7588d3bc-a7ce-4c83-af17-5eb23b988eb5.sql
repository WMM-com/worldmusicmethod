-- Allow authenticated users to see basic profile info of other users
-- This is needed for social features like showing friend avatars, post authors, etc.
-- The sensitive fields are protected by the profiles_public view for anonymous users

DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own profile
  auth.uid() = id
  OR
  -- Admins can see all profiles
  public.has_role(auth.uid(), 'admin')
  OR
  -- Authenticated users can see other users' public profiles (non-sensitive fields protected by view)
  is_public = true
);