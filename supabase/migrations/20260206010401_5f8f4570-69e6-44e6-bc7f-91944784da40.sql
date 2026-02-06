
-- Create a helper function to check if viewer can see a profile based on visibility settings
CREATE OR REPLACE FUNCTION public.can_view_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = target_user_id
    AND (
      -- Owner can always see their own profile
      p.id = auth.uid()
      -- Admin can see all profiles
      OR has_role(auth.uid(), 'admin')
      -- Public profiles are visible to everyone
      OR p.visibility = 'public'
      -- Members visibility: any authenticated user can see
      OR (p.visibility = 'members' AND auth.uid() IS NOT NULL)
      -- Private visibility: only owner and friends can see
      OR (
        p.visibility = 'private' 
        AND auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM friendships f
          WHERE f.status = 'accepted'
          AND (
            (f.user_id = target_user_id AND f.friend_id = auth.uid())
            OR (f.friend_id = target_user_id AND f.user_id = auth.uid())
          )
        )
      )
    )
  )
$$;

-- Drop existing SELECT policies on profile_sections
DROP POLICY IF EXISTS "Public can view sections of public profiles" ON public.profile_sections;
DROP POLICY IF EXISTS "Users can manage own sections" ON public.profile_sections;

-- Create comprehensive policies for profile_sections
CREATE POLICY "Users can manage own sections"
ON public.profile_sections
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Viewers can see sections based on profile visibility"
ON public.profile_sections
FOR SELECT
USING (
  can_view_profile(user_id)
  AND is_visible = true
);

-- Drop existing SELECT policies on profile_pages
DROP POLICY IF EXISTS "Public can view pages of public profiles" ON public.profile_pages;
DROP POLICY IF EXISTS "Users can view their own pages" ON public.profile_pages;

-- Create comprehensive policies for profile_pages
CREATE POLICY "Users can view their own pages"
ON public.profile_pages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Viewers can see pages based on profile visibility"
ON public.profile_pages
FOR SELECT
USING (
  can_view_profile(user_id)
);

-- Update profiles SELECT policy to support visibility properly
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

CREATE POLICY "Users can view profiles based on visibility"
ON public.profiles
FOR SELECT
USING (
  -- Owner can always see their own profile
  auth.uid() = id
  -- Admin can see all profiles
  OR has_role(auth.uid(), 'admin')
  -- Public profiles are visible to everyone
  OR visibility = 'public'
  -- Members visibility: any authenticated user can see
  OR (visibility = 'members' AND auth.uid() IS NOT NULL)
  -- Private visibility: only owner and friends can see
  OR (
    visibility = 'private' 
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
      AND (
        (f.user_id = id AND f.friend_id = auth.uid())
        OR (f.friend_id = id AND f.user_id = auth.uid())
      )
    )
  )
);
