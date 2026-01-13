-- Add country field to media_tracks
ALTER TABLE public.media_tracks ADD COLUMN IF NOT EXISTS country TEXT;

-- Add admin fields to media_playlists for site-wide playlists
ALTER TABLE public.media_playlists ADD COLUMN IF NOT EXISTS is_admin_playlist BOOLEAN DEFAULT false;
ALTER TABLE public.media_playlists ADD COLUMN IF NOT EXISTS show_in_community_feed BOOLEAN DEFAULT false;

-- Add RLS policy for public access to admin playlists
CREATE POLICY "Anyone can view admin playlists"
ON public.media_playlists
FOR SELECT
USING (is_admin_playlist = true);

-- Add RLS policy for reading playlist tracks of admin playlists
CREATE POLICY "Anyone can view admin playlist tracks"
ON public.media_playlist_tracks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM media_playlists 
    WHERE media_playlists.id = media_playlist_tracks.playlist_id 
    AND media_playlists.is_admin_playlist = true
  )
);