-- Media Artists (for royalty tracking)
CREATE TABLE public.media_artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  bio TEXT,
  image_url TEXT,
  external_links JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Media Tracks (songs and podcast episodes)
CREATE TABLE public.media_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist_id UUID REFERENCES public.media_artists(id) ON DELETE SET NULL,
  album_name TEXT,
  media_type TEXT NOT NULL DEFAULT 'audio' CHECK (media_type IN ('audio', 'video')),
  content_type TEXT NOT NULL DEFAULT 'song' CHECK (content_type IN ('song', 'podcast_episode')),
  audio_url TEXT NOT NULL,
  cover_image_url TEXT,
  duration_seconds INTEGER,
  release_date DATE,
  genre TEXT,
  description TEXT,
  is_published BOOLEAN DEFAULT true,
  play_count INTEGER DEFAULT 0,
  podcast_id UUID,
  episode_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Podcasts (RSS feed sources)
CREATE TABLE public.media_podcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  rss_url TEXT,
  cover_image_url TEXT,
  author TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add FK for podcast_id
ALTER TABLE public.media_tracks 
ADD CONSTRAINT media_tracks_podcast_id_fkey 
FOREIGN KEY (podcast_id) REFERENCES public.media_podcasts(id) ON DELETE CASCADE;

-- User Playlists
CREATE TABLE public.media_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Playlist Tracks (junction table)
CREATE TABLE public.media_playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.media_playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.media_tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, track_id)
);

-- User Likes
CREATE TABLE public.media_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  track_id UUID NOT NULL REFERENCES public.media_tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Play Tracking (for accurate royalty calculation)
CREATE TABLE public.media_plays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.media_tracks(id) ON DELETE CASCADE,
  user_id UUID,
  session_id TEXT,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_played_seconds INTEGER,
  completed BOOLEAN DEFAULT false,
  ip_hash TEXT,
  user_agent TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.media_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_plays ENABLE ROW LEVEL SECURITY;

-- Artists: Public read, admin write
CREATE POLICY "Anyone can view artists" ON public.media_artists FOR SELECT USING (true);
CREATE POLICY "Admins can manage artists" ON public.media_artists FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tracks: Public read published, admin write
CREATE POLICY "Anyone can view published tracks" ON public.media_tracks FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage tracks" ON public.media_tracks FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Podcasts: Public read, admin write
CREATE POLICY "Anyone can view active podcasts" ON public.media_podcasts FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage podcasts" ON public.media_podcasts FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Playlists: Owner access + public playlists visible
CREATE POLICY "Users can view own playlists" ON public.media_playlists FOR SELECT USING (user_id = auth.uid() OR is_public = true);
CREATE POLICY "Users can create playlists" ON public.media_playlists FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can update own playlists" ON public.media_playlists FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own playlists" ON public.media_playlists FOR DELETE USING (user_id = auth.uid());

-- Playlist tracks: Based on playlist ownership
CREATE POLICY "Users can view playlist tracks" ON public.media_playlist_tracks FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.media_playlists WHERE id = playlist_id AND (user_id = auth.uid() OR is_public = true)));
CREATE POLICY "Users can manage own playlist tracks" ON public.media_playlist_tracks FOR ALL 
USING (EXISTS (SELECT 1 FROM public.media_playlists WHERE id = playlist_id AND user_id = auth.uid()));

-- Likes: User-specific
CREATE POLICY "Users can view own likes" ON public.media_likes FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can like tracks" ON public.media_likes FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can unlike tracks" ON public.media_likes FOR DELETE USING (user_id = auth.uid());

-- Plays: Anyone can insert (for tracking), admins can view all
CREATE POLICY "Anyone can record plays" ON public.media_plays FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all plays" ON public.media_plays FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own plays" ON public.media_plays FOR SELECT USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_media_tracks_artist ON public.media_tracks(artist_id);
CREATE INDEX idx_media_tracks_podcast ON public.media_tracks(podcast_id);
CREATE INDEX idx_media_tracks_content_type ON public.media_tracks(content_type);
CREATE INDEX idx_media_plays_track ON public.media_plays(track_id);
CREATE INDEX idx_media_plays_played_at ON public.media_plays(played_at);
CREATE INDEX idx_media_likes_user ON public.media_likes(user_id);
CREATE INDEX idx_media_playlist_tracks_playlist ON public.media_playlist_tracks(playlist_id);

-- Trigger to update play_count on tracks
CREATE OR REPLACE FUNCTION public.increment_play_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.media_tracks 
  SET play_count = play_count + 1 
  WHERE id = NEW.track_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_increment_play_count
AFTER INSERT ON public.media_plays
FOR EACH ROW
EXECUTE FUNCTION public.increment_play_count();

-- Updated_at triggers
CREATE TRIGGER update_media_artists_updated_at BEFORE UPDATE ON public.media_artists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_media_tracks_updated_at BEFORE UPDATE ON public.media_tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_media_podcasts_updated_at BEFORE UPDATE ON public.media_podcasts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_media_playlists_updated_at BEFORE UPDATE ON public.media_playlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();