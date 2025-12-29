import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MediaArtist {
  id: string;
  name: string;
  slug: string | null;
  bio: string | null;
  image_url: string | null;
  external_links: Record<string, any>;
  created_at: string;
}

export interface MediaTrack {
  id: string;
  title: string;
  artist_id: string | null;
  album_name: string | null;
  media_type: 'audio' | 'video';
  content_type: 'song' | 'podcast_episode';
  audio_url: string;
  cover_image_url: string | null;
  duration_seconds: number | null;
  release_date: string | null;
  genre: string | null;
  description: string | null;
  is_published: boolean;
  play_count: number;
  podcast_id: string | null;
  episode_number: number | null;
  created_at: string;
  artist?: MediaArtist;
  podcast?: MediaPodcast;
}

export interface MediaPodcast {
  id: string;
  title: string;
  description: string | null;
  rss_url: string | null;
  cover_image_url: string | null;
  author: string | null;
  website_url: string | null;
  is_active: boolean;
  last_fetched_at: string | null;
  created_at: string;
}

export interface MediaPlaylist {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  created_at: string;
  tracks?: MediaTrack[];
}

// Fetch all tracks
export function useTracks(contentType?: 'song' | 'podcast_episode') {
  return useQuery({
    queryKey: ['media-tracks', contentType],
    queryFn: async () => {
      let query = supabase
        .from('media_tracks')
        .select(`
          *,
          artist:media_artists(*),
          podcast:media_podcasts(*)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MediaTrack[];
    },
  });
}

// Search tracks
export function useSearchTracks(searchQuery: string) {
  return useQuery({
    queryKey: ['media-tracks-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      const { data, error } = await supabase
        .from('media_tracks')
        .select(`
          *,
          artist:media_artists(*),
          podcast:media_podcasts(*)
        `)
        .eq('is_published', true)
        .or(`title.ilike.%${searchQuery}%,album_name.ilike.%${searchQuery}%,genre.ilike.%${searchQuery}%`)
        .order('play_count', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as MediaTrack[];
    },
    enabled: searchQuery.length > 0,
  });
}

// Fetch artists
export function useArtists() {
  return useQuery({
    queryKey: ['media-artists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_artists')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as MediaArtist[];
    },
  });
}

// Fetch podcasts
export function usePodcasts() {
  return useQuery({
    queryKey: ['media-podcasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_podcasts')
        .select('*')
        .eq('is_active', true)
        .order('title');
      if (error) throw error;
      return data as MediaPodcast[];
    },
  });
}

// Fetch user playlists
export function useUserPlaylists() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['media-playlists', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('media_playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MediaPlaylist[];
    },
    enabled: !!user,
  });
}

// Fetch playlist with tracks
export function usePlaylist(playlistId: string) {
  return useQuery({
    queryKey: ['media-playlist', playlistId],
    queryFn: async () => {
      const { data: playlist, error: playlistError } = await supabase
        .from('media_playlists')
        .select('*')
        .eq('id', playlistId)
        .single();

      if (playlistError) throw playlistError;

      const { data: playlistTracks, error: tracksError } = await supabase
        .from('media_playlist_tracks')
        .select(`
          position,
          track:media_tracks(
            *,
            artist:media_artists(*),
            podcast:media_podcasts(*)
          )
        `)
        .eq('playlist_id', playlistId)
        .order('position');

      if (tracksError) throw tracksError;

      return {
        ...playlist,
        tracks: playlistTracks.map(pt => pt.track),
      } as MediaPlaylist;
    },
    enabled: !!playlistId,
  });
}

// Create playlist
export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('media_playlists')
        .insert({
          user_id: user?.id || null,
          name,
          description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-playlists'] });
    },
  });
}

// Add track to playlist
export function useAddToPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      // Get current max position
      const { data: existing } = await supabase
        .from('media_playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { error } = await supabase
        .from('media_playlist_tracks')
        .insert({
          playlist_id: playlistId,
          track_id: trackId,
          position: nextPosition,
        });

      if (error) throw error;
    },
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['media-playlist', playlistId] });
    },
  });
}

// Remove from playlist
export function useRemoveFromPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      const { error } = await supabase
        .from('media_playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId);

      if (error) throw error;
    },
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['media-playlist', playlistId] });
    },
  });
}

// User likes
export function useUserLikes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['media-likes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('media_likes')
        .select('track_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(l => l.track_id);
    },
    enabled: !!user,
  });
}

// Toggle like
export function useToggleLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ trackId, isLiked }: { trackId: string; isLiked: boolean }) => {
      if (!user) throw new Error('Must be logged in to like tracks');

      if (isLiked) {
        const { error } = await supabase
          .from('media_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('track_id', trackId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('media_likes')
          .insert({ user_id: user.id, track_id: trackId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-likes'] });
    },
  });
}

// Record play
export function useRecordPlay() {
  return useMutation({
    mutationFn: async ({ 
      trackId, 
      durationPlayed, 
      completed,
      sessionId 
    }: { 
      trackId: string; 
      durationPlayed?: number;
      completed?: boolean;
      sessionId?: string;
    }) => {
      const { error } = await supabase
        .from('media_plays')
        .insert({
          track_id: trackId,
          duration_played_seconds: durationPlayed,
          completed,
          session_id: sessionId,
        });

      if (error) throw error;
    },
  });
}

// Fetch liked tracks
export function useLikedTracks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['media-liked-tracks', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('media_likes')
        .select(`
          track:media_tracks(
            *,
            artist:media_artists(*),
            podcast:media_podcasts(*)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(l => l.track) as MediaTrack[];
    },
    enabled: !!user,
  });
}
