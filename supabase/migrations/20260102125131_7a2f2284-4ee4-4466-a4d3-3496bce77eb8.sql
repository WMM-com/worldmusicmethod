-- Add policy for users to view their own playlists (private or public)
DROP POLICY IF EXISTS "Users can view own playlists" ON public.media_playlists;
CREATE POLICY "Users can view own playlists"
ON public.media_playlists
FOR SELECT
USING (user_id = auth.uid());

-- Update the insert policy to require user_id for logged-in users
DROP POLICY IF EXISTS "Users can create playlists" ON public.media_playlists;
CREATE POLICY "Users can create playlists"
ON public.media_playlists
FOR INSERT
WITH CHECK (user_id = auth.uid());