-- Add RLS policy for public playlists to be viewable by everyone
-- This allows non-logged-in users to view public playlists

-- First check if the policy exists and drop it if so
DROP POLICY IF EXISTS "Public playlists are viewable by everyone" ON public.media_playlists;

-- Create policy for public playlist viewing
CREATE POLICY "Public playlists are viewable by everyone" 
ON public.media_playlists 
FOR SELECT 
USING (is_public = true);

-- Also allow viewing playlist tracks for public playlists
DROP POLICY IF EXISTS "Public playlist tracks are viewable" ON public.media_playlist_tracks;

CREATE POLICY "Public playlist tracks are viewable" 
ON public.media_playlist_tracks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.media_playlists 
    WHERE id = media_playlist_tracks.playlist_id 
    AND is_public = true
  )
);