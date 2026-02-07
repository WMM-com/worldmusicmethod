import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Music, Podcast, Users, Play, Trash2, Edit, BarChart3, Upload, Loader2, X, ListMusic, RefreshCw, GripVertical, ChevronDown, ChevronRight, DollarSign } from 'lucide-react';
import { AdminRevenuePool } from './AdminRevenuePool';
import { useR2Upload } from '@/hooks/useR2Upload';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Artist = {
  id: string;
  name: string;
  bio: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  country: string | null;
  slug: string | null;
};

type Track = {
  id: string;
  title: string;
  audio_url: string;
  cover_image_url: string | null;
  media_type: string;
  content_type: string;
  duration_seconds: number | null;
  play_count: number | null;
  is_published: boolean | null;
  artist_id: string | null;
  artist?: Artist | null;
  album_name: string | null;
  genre: string | null;
  release_date: string | null;
  country: string | null;
};

type Playlist = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  is_admin_playlist: boolean;
  show_in_community_feed: boolean;
};

type PodcastType = {
  id: string;
  title: string;
  description: string | null;
  author: string | null;
  cover_image_url: string | null;
  rss_url: string | null;
  is_active: boolean | null;
};

export function AdminStreaming() {
  const queryClient = useQueryClient();
  const { uploadFile, isUploading, progress } = useR2Upload();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const artistProfileInputRef = useRef<HTMLInputElement>(null);
  const artistCoverInputRef = useRef<HTMLInputElement>(null);
  const [artistDialogOpen, setArtistDialogOpen] = useState(false);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [podcastDialogOpen, setPodcastDialogOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [uploadingField, setUploadingField] = useState<'audio' | 'cover' | 'artist_profile' | 'artist_cover' | null>(null);

  // Form states
  const [artistForm, setArtistForm] = useState({ name: '', bio: '', image_url: '', cover_image_url: '', country: '' });
  const [trackForm, setTrackForm] = useState({
    title: '',
    audio_url: '',
    cover_image_url: '',
    media_type: 'audio',
    content_type: 'song',
    duration_seconds: '',
    artist_id: '',
    album_name: '',
    genre: '',
    country: '',
    release_year: '',
    is_published: true,
  });
  const [adminPlaylistForm, setAdminPlaylistForm] = useState({
    name: '',
    description: '',
    is_public: true,
    is_admin_playlist: true,
    show_in_community_feed: false,
  });
  const [podcastForm, setPodcastForm] = useState({
    title: '',
    description: '',
    author: '',
    cover_image_url: '',
    rss_url: '',
  });

  // Queries
  const { data: artists = [] } = useQuery({
    queryKey: ['admin-artists'],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_artists').select('*').order('name');
      if (error) throw error;
      return data as Artist[];
    },
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['admin-tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_tracks')
        .select('*, artist:media_artists(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Track[];
    },
  });

  const { data: podcasts = [] } = useQuery({
    queryKey: ['admin-podcasts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_podcasts').select('*').order('title');
      if (error) throw error;
      return data as PodcastType[];
    },
  });

  const { data: adminPlaylists = [] } = useQuery({
    queryKey: ['admin-playlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_playlists')
        .select('*')
        .eq('is_admin_playlist', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Playlist[];
    },
  });

  const { data: playStats } = useQuery({
    queryKey: ['admin-play-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_plays')
        .select('track_id, media_tracks(title, artist:media_artists(name))')
        .order('played_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      
      // Count plays per track
      const counts: Record<string, { title: string; artist: string; count: number }> = {};
      data?.forEach((play: any) => {
        if (!counts[play.track_id]) {
          counts[play.track_id] = {
            title: play.media_tracks?.title || 'Unknown',
            artist: play.media_tracks?.artist?.name || 'Unknown',
            count: 0,
          };
        }
        counts[play.track_id].count++;
      });
      
      return Object.entries(counts)
        .map(([id, stats]) => ({ id, ...stats }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  // Mutations
  const createArtist = useMutation({
    mutationFn: async (data: typeof artistForm) => {
      const { error } = await supabase.from('media_artists').insert({
        name: data.name,
        bio: data.bio || null,
        image_url: data.image_url || null,
        cover_image_url: data.cover_image_url || null,
        country: data.country || null,
        slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] });
      setArtistDialogOpen(false);
      setArtistForm({ name: '', bio: '', image_url: '', cover_image_url: '', country: '' });
      toast.success('Artist created');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateArtist = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof artistForm) => {
      const { error } = await supabase.from('media_artists').update({
        name: data.name,
        bio: data.bio || null,
        image_url: data.image_url || null,
        cover_image_url: data.cover_image_url || null,
        country: data.country || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] });
      setArtistDialogOpen(false);
      setEditingArtist(null);
      setArtistForm({ name: '', bio: '', image_url: '', cover_image_url: '', country: '' });
      toast.success('Artist updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteArtist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('media_artists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] });
      toast.success('Artist deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createTrack = useMutation({
    mutationFn: async (data: typeof trackForm) => {
      const { error } = await supabase.from('media_tracks').insert({
        title: data.title,
        audio_url: data.audio_url,
        cover_image_url: data.cover_image_url || null,
        media_type: data.media_type,
        content_type: data.content_type,
        duration_seconds: data.duration_seconds ? parseInt(data.duration_seconds) : null,
        artist_id: data.artist_id || null,
        album_name: data.album_name || null,
        genre: data.genre || null,
        country: data.country || null,
        release_date: data.release_year ? `${data.release_year}-01-01` : null,
        is_published: data.is_published,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['media-tracks'] });
      setTrackDialogOpen(false);
      setTrackForm({
        title: '',
        audio_url: '',
        cover_image_url: '',
        media_type: 'audio',
        content_type: 'song',
        duration_seconds: '',
        artist_id: '',
        album_name: '',
        genre: '',
        country: '',
        release_year: '',
        is_published: true,
      });
      toast.success('Track created');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateTrack = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof trackForm) => {
      const { error } = await supabase.from('media_tracks').update({
        title: data.title,
        audio_url: data.audio_url,
        cover_image_url: data.cover_image_url || null,
        media_type: data.media_type,
        content_type: data.content_type,
        duration_seconds: data.duration_seconds ? parseInt(data.duration_seconds) : null,
        artist_id: data.artist_id || null,
        album_name: data.album_name || null,
        genre: data.genre || null,
        country: data.country || null,
        release_date: data.release_year ? `${data.release_year}-01-01` : null,
        is_published: data.is_published,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['media-tracks'] });
      setTrackDialogOpen(false);
      setEditingTrack(null);
      toast.success('Track updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTrack = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('media_tracks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['media-tracks'] });
      toast.success('Track deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createPodcast = useMutation({
    mutationFn: async (data: typeof podcastForm) => {
      const { error } = await supabase.from('media_podcasts').insert({
        title: data.title,
        description: data.description || null,
        author: data.author || null,
        cover_image_url: data.cover_image_url || null,
        rss_url: data.rss_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-podcasts'] });
      setPodcastDialogOpen(false);
      setPodcastForm({ title: '', description: '', author: '', cover_image_url: '', rss_url: '' });
      toast.success('Podcast created');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createAdminPlaylist = useMutation({
    mutationFn: async (data: typeof adminPlaylistForm) => {
      const { error } = await supabase.from('media_playlists').insert({
        name: data.name,
        description: data.description || null,
        is_public: data.is_public,
        is_admin_playlist: true,
        show_in_community_feed: data.show_in_community_feed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['media-admin-playlists'] });
      setPlaylistDialogOpen(false);
      setAdminPlaylistForm({ name: '', description: '', is_public: true, is_admin_playlist: true, show_in_community_feed: false });
      toast.success('Playlist created');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateAdminPlaylist = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof adminPlaylistForm) => {
      const { error } = await supabase.from('media_playlists').update({
        name: data.name,
        description: data.description || null,
        is_public: data.is_public,
        show_in_community_feed: data.show_in_community_feed,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['media-admin-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['media-community-feed-playlist'] });
      setPlaylistDialogOpen(false);
      setEditingPlaylist(null);
      toast.success('Playlist updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteAdminPlaylist = useMutation({
    mutationFn: async (id: string) => {
      // First delete playlist tracks
      await supabase.from('media_playlist_tracks').delete().eq('playlist_id', id);
      // Then delete the playlist
      const { error } = await supabase.from('media_playlists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['media-admin-playlists'] });
      toast.success('Playlist deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [syncingPodcast, setSyncingPodcast] = useState<string | null>(null);

  const syncPodcastRss = async (podcastId: string) => {
    setSyncingPodcast(podcastId);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-podcast-rss', {
        body: { podcastId },
      });
      if (error) throw error;
      toast.success(data.message || 'Podcast synced successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['media-tracks'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync podcast');
    } finally {
      setSyncingPodcast(null);
    }
  };

  const openEditArtist = (artist: Artist) => {
    setEditingArtist(artist);
    setArtistForm({ 
      name: artist.name, 
      bio: artist.bio || '', 
      image_url: artist.image_url || '',
      cover_image_url: artist.cover_image_url || '',
      country: artist.country || '',
    });
    setArtistDialogOpen(true);
  };

  const openEditTrack = (track: Track) => {
    setEditingTrack(track);
    const releaseYear = track.release_date ? new Date(track.release_date).getFullYear().toString() : '';
    setTrackForm({
      title: track.title,
      audio_url: track.audio_url,
      cover_image_url: track.cover_image_url || '',
      media_type: track.media_type,
      content_type: track.content_type,
      duration_seconds: track.duration_seconds?.toString() || '',
      artist_id: track.artist_id || '',
      album_name: track.album_name || '',
      genre: track.genre || '',
      country: track.country || '',
      release_year: releaseYear,
      is_published: track.is_published ?? true,
    });
    setTrackDialogOpen(true);
  };

  const openEditPlaylist = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setAdminPlaylistForm({
      name: playlist.name,
      description: playlist.description || '',
      is_public: playlist.is_public,
      is_admin_playlist: true,
      show_in_community_feed: playlist.show_in_community_feed,
    });
    setPlaylistDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Streaming Platform
          </CardTitle>
          <CardDescription>
            Manage artists, tracks, and podcasts for the media streaming section
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="tracks" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="tracks" className="gap-2">
            <Music className="h-4 w-4" />
            <span className="hidden sm:inline">Tracks</span> ({tracks.length})
          </TabsTrigger>
          <TabsTrigger value="playlists" className="gap-2">
            <ListMusic className="h-4 w-4" />
            <span className="hidden sm:inline">Playlists</span> ({adminPlaylists.length})
          </TabsTrigger>
          <TabsTrigger value="artists" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Artists</span> ({artists.length})
          </TabsTrigger>
          <TabsTrigger value="podcasts" className="gap-2">
            <Podcast className="h-4 w-4" />
            <span className="hidden sm:inline">Podcasts</span> ({podcasts.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Revenue Pool</span>
          </TabsTrigger>
        </TabsList>

        {/* Tracks Tab */}
        <TabsContent value="tracks">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle>Tracks</CardTitle>
              <Dialog open={trackDialogOpen} onOpenChange={(open) => {
                setTrackDialogOpen(open);
                if (!open) {
                  setEditingTrack(null);
                  setTrackForm({
                    title: '',
                    audio_url: '',
                    cover_image_url: '',
                    media_type: 'audio',
                    content_type: 'song',
                    duration_seconds: '',
                    artist_id: '',
                    album_name: '',
                    genre: '',
                    country: '',
                    release_year: '',
                    is_published: true,
                  });
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Track
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingTrack ? 'Edit Track' : 'Add Track'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (editingTrack) {
                      updateTrack.mutate({ id: editingTrack.id, ...trackForm });
                    } else {
                      createTrack.mutate(trackForm);
                    }
                  }} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input
                          value={trackForm.title}
                          onChange={(e) => setTrackForm(p => ({ ...p, title: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Artist</Label>
                        <Select
                          value={trackForm.artist_id}
                          onValueChange={(v) => setTrackForm(p => ({ ...p, artist_id: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select artist" />
                          </SelectTrigger>
                          <SelectContent>
                            {artists.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Audio File / URL *</Label>
                      <div className="flex gap-2">
                        <Input
                          value={trackForm.audio_url}
                          onChange={(e) => setTrackForm(p => ({ ...p, audio_url: e.target.value }))}
                          placeholder="https://... or upload file"
                          required
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => audioInputRef.current?.click()}
                          disabled={isUploading && uploadingField === 'audio'}
                        >
                          {isUploading && uploadingField === 'audio' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                        <input
                          ref={audioInputRef}
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            // Auto-detect duration
                            const audio = new Audio();
                            audio.src = URL.createObjectURL(file);
                            audio.addEventListener('loadedmetadata', () => {
                              const durationSecs = Math.round(audio.duration);
                              setTrackForm(p => ({ ...p, duration_seconds: durationSecs.toString() }));
                              URL.revokeObjectURL(audio.src);
                            });
                            
                            setUploadingField('audio');
                            const result = await uploadFile(file, {
                              bucket: 'admin',
                              folder: 'streaming/audio',
                              trackInDatabase: true,
                            });
                            if (result) {
                              setTrackForm(p => ({ ...p, audio_url: result.url }));
                              toast.success('Audio file uploaded');
                            }
                            setUploadingField(null);
                            if (audioInputRef.current) audioInputRef.current.value = '';
                          }}
                        />
                      </div>
                      {isUploading && uploadingField === 'audio' && (
                        <div className="text-xs text-muted-foreground">Uploading: {progress}%</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Cover Image</Label>
                      <div className="flex gap-2">
                        <Input
                          value={trackForm.cover_image_url}
                          onChange={(e) => setTrackForm(p => ({ ...p, cover_image_url: e.target.value }))}
                          placeholder="https://... or upload file"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => coverInputRef.current?.click()}
                          disabled={isUploading && uploadingField === 'cover'}
                        >
                          {isUploading && uploadingField === 'cover' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                        {trackForm.cover_image_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setTrackForm(p => ({ ...p, cover_image_url: '' }))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingField('cover');
                            const result = await uploadFile(file, {
                              bucket: 'admin',
                              folder: 'streaming/covers',
                              imageOptimization: 'media',
                              trackInDatabase: true,
                            });
                            if (result) {
                              setTrackForm(p => ({ ...p, cover_image_url: result.url }));
                              toast.success('Cover image uploaded');
                            }
                            setUploadingField(null);
                            if (coverInputRef.current) coverInputRef.current.value = '';
                          }}
                        />
                      </div>
                      {trackForm.cover_image_url && (
                        <img 
                          src={trackForm.cover_image_url} 
                          alt="Cover preview" 
                          className="w-20 h-20 object-cover rounded border"
                        />
                      )}
                      {isUploading && uploadingField === 'cover' && (
                        <div className="text-xs text-muted-foreground">Uploading: {progress}%</div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Content Type</Label>
                        <Select
                          value={trackForm.content_type}
                          onValueChange={(v) => setTrackForm(p => ({ ...p, content_type: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="song">Song</SelectItem>
                            <SelectItem value="podcast_episode">Podcast Episode</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Duration (seconds)</Label>
                        <Input
                          type="number"
                          value={trackForm.duration_seconds}
                          onChange={(e) => setTrackForm(p => ({ ...p, duration_seconds: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Album</Label>
                        <Input
                          value={trackForm.album_name}
                          onChange={(e) => setTrackForm(p => ({ ...p, album_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Genre</Label>
                        <Input
                          value={trackForm.genre}
                          onChange={(e) => setTrackForm(p => ({ ...p, genre: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Country</Label>
                        <Input
                          value={trackForm.country}
                          onChange={(e) => setTrackForm(p => ({ ...p, country: e.target.value }))}
                          placeholder="e.g. Brazil"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Year</Label>
                        <Input
                          type="number"
                          min="1900"
                          max={new Date().getFullYear()}
                          placeholder="e.g. 2024"
                          value={trackForm.release_year}
                          onChange={(e) => setTrackForm(p => ({ ...p, release_year: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={trackForm.is_published}
                        onCheckedChange={(c) => setTrackForm(p => ({ ...p, is_published: c }))}
                      />
                      <Label>Published</Label>
                    </div>
                    <Button type="submit" className="w-full">
                      {editingTrack ? 'Update' : 'Create'} Track
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Plays</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tracks.map((track) => (
                    <TableRow key={track.id}>
                      <TableCell className="font-medium">{track.title}</TableCell>
                      <TableCell>{track.artist?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{track.content_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {track.play_count || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={track.is_published ? 'default' : 'secondary'}>
                          {track.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" onClick={() => openEditTrack(track)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteTrack.mutate(track.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Playlists Tab */}
        <TabsContent value="playlists">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Admin Playlists</CardTitle>
              <Dialog open={playlistDialogOpen} onOpenChange={(open) => {
                setPlaylistDialogOpen(open);
                if (!open) {
                  setEditingPlaylist(null);
                  setAdminPlaylistForm({
                    name: '',
                    description: '',
                    is_public: true,
                    is_admin_playlist: true,
                    show_in_community_feed: false,
                  });
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Playlist
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingPlaylist ? 'Edit Playlist' : 'Create Admin Playlist'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (editingPlaylist) {
                      updateAdminPlaylist.mutate({ id: editingPlaylist.id, ...adminPlaylistForm });
                    } else {
                      createAdminPlaylist.mutate(adminPlaylistForm);
                    }
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Playlist Name *</Label>
                      <Input
                        value={adminPlaylistForm.name}
                        onChange={(e) => setAdminPlaylistForm(p => ({ ...p, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={adminPlaylistForm.description}
                        onChange={(e) => setAdminPlaylistForm(p => ({ ...p, description: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={adminPlaylistForm.is_public}
                          onCheckedChange={(c) => setAdminPlaylistForm(p => ({ ...p, is_public: c }))}
                        />
                        <Label>Public</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={adminPlaylistForm.show_in_community_feed}
                          onCheckedChange={(c) => setAdminPlaylistForm(p => ({ ...p, show_in_community_feed: c }))}
                        />
                        <Label>Show in Community Feed</Label>
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      {editingPlaylist ? 'Update' : 'Create'} Playlist
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Tracks</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Community Feed</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminPlaylists.map((playlist) => (
                    <AdminPlaylistRow key={playlist.id} playlist={playlist} onEdit={openEditPlaylist} onDelete={(id) => deleteAdminPlaylist.mutate(id)} tracks={tracks} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Artists Tab */}
        <TabsContent value="artists">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Artists</CardTitle>
              <Dialog open={artistDialogOpen} onOpenChange={(open) => {
                setArtistDialogOpen(open);
                if (!open) {
                  setEditingArtist(null);
                  setArtistForm({ name: '', bio: '', image_url: '', cover_image_url: '', country: '' });
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Artist
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingArtist ? 'Edit Artist' : 'Add Artist'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (editingArtist) {
                      updateArtist.mutate({ id: editingArtist.id, ...artistForm });
                    } else {
                      createArtist.mutate(artistForm);
                    }
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={artistForm.name}
                        onChange={(e) => setArtistForm(p => ({ ...p, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        value={artistForm.country}
                        onChange={(e) => setArtistForm(p => ({ ...p, country: e.target.value }))}
                        placeholder="e.g. Senegal, Mali, Cuba"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Textarea
                        value={artistForm.bio}
                        onChange={(e) => setArtistForm(p => ({ ...p, bio: e.target.value }))}
                        rows={4}
                        placeholder="A brief description of the artist..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Profile Image</Label>
                      <div className="flex gap-2">
                        <Input
                          value={artistForm.image_url}
                          onChange={(e) => setArtistForm(p => ({ ...p, image_url: e.target.value }))}
                          placeholder="https://... (square/avatar image)"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => artistProfileInputRef.current?.click()}
                          disabled={isUploading && uploadingField === 'artist_profile'}
                        >
                          {isUploading && uploadingField === 'artist_profile' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                        <input
                          ref={artistProfileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingField('artist_profile');
                            const result = await uploadFile(file, {
                              bucket: 'admin',
                              folder: 'streaming/artists',
                              imageOptimization: 'avatar',
                              trackInDatabase: true,
                            });
                            if (result) {
                              setArtistForm(p => ({ ...p, image_url: result.url }));
                              toast.success('Profile image uploaded');
                            }
                            setUploadingField(null);
                            if (artistProfileInputRef.current) artistProfileInputRef.current.value = '';
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Used for avatar/profile display</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Cover Image</Label>
                      <div className="flex gap-2">
                        <Input
                          value={artistForm.cover_image_url}
                          onChange={(e) => setArtistForm(p => ({ ...p, cover_image_url: e.target.value }))}
                          placeholder="https://... (widescreen/banner image)"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => artistCoverInputRef.current?.click()}
                          disabled={isUploading && uploadingField === 'artist_cover'}
                        >
                          {isUploading && uploadingField === 'artist_cover' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                        <input
                          ref={artistCoverInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingField('artist_cover');
                            const result = await uploadFile(file, {
                              bucket: 'admin',
                              folder: 'streaming/artists',
                              imageOptimization: 'feed',
                              trackInDatabase: true,
                            });
                            if (result) {
                              setArtistForm(p => ({ ...p, cover_image_url: result.url }));
                              toast.success('Cover image uploaded');
                            }
                            setUploadingField(null);
                            if (artistCoverInputRef.current) artistCoverInputRef.current.value = '';
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Used as header banner on artist page (recommended 16:9 ratio)</p>
                    </div>
                    <Button type="submit" className="w-full">
                      {editingArtist ? 'Update' : 'Create'} Artist
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Artist</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artists.map((artist) => (
                    <TableRow key={artist.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {artist.image_url ? (
                            <img src={artist.image_url} alt={artist.name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <Users className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{artist.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{artist.slug}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" onClick={() => openEditArtist(artist)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteArtist.mutate(artist.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Podcasts Tab */}
        <TabsContent value="podcasts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Podcasts</CardTitle>
              <Dialog open={podcastDialogOpen} onOpenChange={setPodcastDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Podcast
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Podcast</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    createPodcast.mutate(podcastForm);
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={podcastForm.title}
                        onChange={(e) => setPodcastForm(p => ({ ...p, title: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Author</Label>
                      <Input
                        value={podcastForm.author}
                        onChange={(e) => setPodcastForm(p => ({ ...p, author: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={podcastForm.description}
                        onChange={(e) => setPodcastForm(p => ({ ...p, description: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cover Image URL</Label>
                      <Input
                        value={podcastForm.cover_image_url}
                        onChange={(e) => setPodcastForm(p => ({ ...p, cover_image_url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>RSS Feed URL</Label>
                      <Input
                        value={podcastForm.rss_url}
                        onChange={(e) => setPodcastForm(p => ({ ...p, rss_url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <Button type="submit" className="w-full">Create Podcast</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Podcast</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>RSS</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {podcasts.map((podcast) => (
                    <PodcastRow 
                      key={podcast.id} 
                      podcast={podcast} 
                      onSync={() => syncPodcastRss(podcast.id)} 
                      isSyncing={syncingPodcast === podcast.id} 
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Play Analytics</CardTitle>
              <CardDescription>Top 10 most played tracks (last 100 plays)</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Track</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead>Plays</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playStats?.map((stat, i) => (
                    <TableRow key={stat.id}>
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell>{stat.title}</TableCell>
                      <TableCell>{stat.artist}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {stat.count}
                        </div>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No play data yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Pool Tab */}
        <TabsContent value="revenue">
          <AdminRevenuePool />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sortable playlist track item
function SortablePlaylistTrack({ pt, onRemove }: { pt: any; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pt.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 rounded bg-background border border-border"
    >
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab p-1 hover:bg-muted rounded">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        {pt.track?.cover_image_url && (
          <img src={pt.track.cover_image_url} alt="" className="h-8 w-8 rounded object-cover" />
        )}
        <div>
          <p className="text-sm font-medium">{pt.track?.title}</p>
          <p className="text-xs text-muted-foreground">{pt.track?.artist?.name}</p>
        </div>
      </div>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-7 w-7"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

// Admin Playlist Row Component with track management and drag-to-reorder
function AdminPlaylistRow({ 
  playlist, 
  onEdit, 
  onDelete,
  tracks 
}: { 
  playlist: Playlist; 
  onEdit: (p: Playlist) => void; 
  onDelete: (id: string) => void;
  tracks: Track[];
}) {
  const [showTracks, setShowTracks] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch tracks in this playlist
  const { data: playlistTracks = [] } = useQuery({
    queryKey: ['admin-playlist-tracks', playlist.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_playlist_tracks')
        .select(`
          id,
          position,
          track:media_tracks(id, title, artist:media_artists(name), cover_image_url)
        `)
        .eq('playlist_id', playlist.id)
        .order('position');
      if (error) throw error;
      return data;
    },
  });

  const addToPlaylist = useMutation({
    mutationFn: async (trackId: string) => {
      const maxPos = playlistTracks.length > 0 
        ? Math.max(...playlistTracks.map(t => t.position || 0)) 
        : -1;
      const { error } = await supabase
        .from('media_playlist_tracks')
        .insert({
          playlist_id: playlist.id,
          track_id: trackId,
          position: maxPos + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-playlist-tracks', playlist.id] });
      queryClient.invalidateQueries({ queryKey: ['media-playlist', playlist.id] });
      toast.success('Track added');
      setSearchTerm('');
    },
    onError: (err: any) => toast.error(err.message || 'Already in playlist'),
  });

  const removeFromPlaylist = useMutation({
    mutationFn: async (playlistTrackId: string) => {
      const { error } = await supabase
        .from('media_playlist_tracks')
        .delete()
        .eq('id', playlistTrackId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-playlist-tracks', playlist.id] });
      queryClient.invalidateQueries({ queryKey: ['media-playlist', playlist.id] });
      toast.success('Track removed');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const reorderTracks = useMutation({
    mutationFn: async (reorderedTracks: typeof playlistTracks) => {
      // Update positions for all tracks
      const updates = reorderedTracks.map((pt, idx) => 
        supabase
          .from('media_playlist_tracks')
          .update({ position: idx })
          .eq('id', pt.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-playlist-tracks', playlist.id] });
      queryClient.invalidateQueries({ queryKey: ['media-playlist', playlist.id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = playlistTracks.findIndex((pt: any) => pt.id === active.id);
    const newIndex = playlistTracks.findIndex((pt: any) => pt.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(playlistTracks, oldIndex, newIndex);
      // Optimistically update the UI
      queryClient.setQueryData(['admin-playlist-tracks', playlist.id], reordered);
      reorderTracks.mutate(reordered);
    }
  };

  const playlistTrackIds = new Set(playlistTracks.map((pt: any) => pt.track?.id));
  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !playlistTrackIds.has(t.id)
  );

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
              <ListMusic className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <span className="font-medium">{playlist.name}</span>
              {playlist.description && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{playlist.description}</p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowTracks(!showTracks)}
            className="gap-1"
          >
            {showTracks ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Music className="h-3 w-3" />
            {playlistTracks.length} tracks
          </Button>
        </TableCell>
        <TableCell>
          <Badge variant={playlist.is_public ? 'default' : 'secondary'}>
            {playlist.is_public ? 'Public' : 'Private'}
          </Badge>
        </TableCell>
        <TableCell>
          {playlist.show_in_community_feed ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-600">Featured</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => onEdit(playlist)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(playlist.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      
      {showTracks && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30 p-4">
            <div className="space-y-4">
              {/* Add tracks */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Add tracks to playlist</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search tracks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>
                {searchTerm && filteredTracks.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {filteredTracks.slice(0, 10).map(track => (
                      <div 
                        key={track.id} 
                        className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer"
                        onClick={() => addToPlaylist.mutate(track.id)}
                      >
                        <div className="flex items-center gap-2">
                          {track.cover_image_url && (
                            <img src={track.cover_image_url} alt="" className="h-8 w-8 rounded object-cover" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{track.title}</p>
                            <p className="text-xs text-muted-foreground">{track.artist?.name}</p>
                          </div>
                        </div>
                        <Plus className="h-4 w-4" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current tracks with drag to reorder */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Current tracks (drag to reorder)</Label>
                {playlistTracks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tracks in playlist yet</p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={playlistTracks.map((pt: any) => pt.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1">
                        {playlistTracks.map((pt: any) => (
                          <SortablePlaylistTrack
                            key={pt.id}
                            pt={pt}
                            onRemove={() => removeFromPlaylist.mutate(pt.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// Sortable podcast episode item
function SortablePodcastEpisode({ episode, onUpdateEpisodeNumber }: { episode: any; onUpdateEpisodeNumber: (id: string, num: number) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: episode.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 rounded bg-background border border-border"
    >
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab p-1 hover:bg-muted rounded">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <Badge variant="outline" className="shrink-0">Ep {episode.episode_number}</Badge>
        {episode.cover_image_url && (
          <img src={episode.cover_image_url} alt="" className="h-8 w-8 rounded object-cover" />
        )}
        <p className="text-sm font-medium truncate max-w-[300px]">{episode.title}</p>
      </div>
    </div>
  );
}

// Podcast Episodes Manager Component
function PodcastEpisodesManager({ podcastId, podcastTitle }: { podcastId: string; podcastTitle: string }) {
  const queryClient = useQueryClient();
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: episodes = [] } = useQuery({
    queryKey: ['podcast-episodes', podcastId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_tracks')
        .select('id, title, episode_number, cover_image_url')
        .eq('podcast_id', podcastId)
        .order('episode_number', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const reorderEpisodes = useMutation({
    mutationFn: async (reordered: typeof episodes) => {
      // Update episode numbers based on new order
      const updates = reordered.map((ep, idx) =>
        supabase
          .from('media_tracks')
          .update({ episode_number: idx + 1 })
          .eq('id', ep.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes', podcastId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['media-tracks'] });
      toast.success('Episode order updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = episodes.findIndex((ep: any) => ep.id === active.id);
    const newIndex = episodes.findIndex((ep: any) => ep.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(episodes, oldIndex, newIndex).map((ep, idx) => ({
        ...ep,
        episode_number: idx + 1,
      }));
      // Optimistically update the UI
      queryClient.setQueryData(['podcast-episodes', podcastId], reordered);
      reorderEpisodes.mutate(reordered);
    }
  };

  const updateEpisodeNumber = (id: string, num: number) => {
    // Not used in drag mode but kept for potential manual editing
  };

  if (episodes.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No episodes yet. Sync the RSS feed to import episodes.</p>;
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Episodes (drag to reorder)</Label>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={episodes.map((ep: any) => ep.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {episodes.map((episode: any) => (
              <SortablePodcastEpisode
                key={episode.id}
                episode={episode}
                onUpdateEpisodeNumber={updateEpisodeNumber}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// Podcast row with expandable episodes
function PodcastRow({ 
  podcast, 
  onSync, 
  isSyncing 
}: { 
  podcast: PodcastType; 
  onSync: () => void; 
  isSyncing: boolean;
}) {
  const [showEpisodes, setShowEpisodes] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            {podcast.cover_image_url ? (
              <img src={podcast.cover_image_url} alt={podcast.title} className="h-10 w-10 rounded object-cover" />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                <Podcast className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <span className="font-medium">{podcast.title}</span>
          </div>
        </TableCell>
        <TableCell>{podcast.author || '-'}</TableCell>
        <TableCell>
          {podcast.rss_url ? (
            <Badge variant="outline">Has RSS</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEpisodes(!showEpisodes)}
              className="gap-1"
            >
              {showEpisodes ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Episodes
            </Button>
            {podcast.rss_url && (
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2"
                onClick={onSync}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      {showEpisodes && (
        <TableRow>
          <TableCell colSpan={4} className="bg-muted/30 p-4">
            <PodcastEpisodesManager podcastId={podcast.id} podcastTitle={podcast.title} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
