
-- Update profile_gallery policies to use visibility function
DROP POLICY IF EXISTS "Public can view gallery of public profiles" ON public.profile_gallery;

CREATE POLICY "Viewers can see gallery based on profile visibility"
ON public.profile_gallery
FOR SELECT
USING (can_view_profile(user_id));

-- Update profile_projects policies to use visibility function
DROP POLICY IF EXISTS "Public can view projects of public profiles" ON public.profile_projects;

CREATE POLICY "Viewers can see projects based on profile visibility"
ON public.profile_projects
FOR SELECT
USING (can_view_profile(user_id));

-- Update profile_tabs policies to use visibility function
DROP POLICY IF EXISTS "Public can view tabs of public profiles" ON public.profile_tabs;

CREATE POLICY "Viewers can see tabs based on profile visibility"
ON public.profile_tabs
FOR SELECT
USING (can_view_profile(user_id));
