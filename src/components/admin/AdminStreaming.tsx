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
import { Plus, Music, Podcast, Users, Play, Trash2, Edit, BarChart3, Upload, Loader2, X } from 'lucide-react';
import { useR2Upload } from '@/hooks/useR2Upload';

type Artist = {
  id: string;
  name: string;
  bio: string | null;
  image_url: string | null;
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
  const [artistDialogOpen, setArtistDialogOpen] = useState(false);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [podcastDialogOpen, setPodcastDialogOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [uploadingField, setUploadingField] = useState<'audio' | 'cover' | null>(null);

  // Form states
  const [artistForm, setArtistForm] = useState({ name: '', bio: '', image_url: '' });
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
    is_published: true,
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
        slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] });
      setArtistDialogOpen(false);
      setArtistForm({ name: '', bio: '', image_url: '' });
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
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] });
      setArtistDialogOpen(false);
      setEditingArtist(null);
      setArtistForm({ name: '', bio: '', image_url: '' });
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

  const openEditArtist = (artist: Artist) => {
    setEditingArtist(artist);
    setArtistForm({ name: artist.name, bio: artist.bio || '', image_url: artist.image_url || '' });
    setArtistDialogOpen(true);
  };

  const openEditTrack = (track: Track) => {
    setEditingTrack(track);
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
      is_published: track.is_published ?? true,
    });
    setTrackDialogOpen(true);
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
        <TabsList>
          <TabsTrigger value="tracks" className="gap-2">
            <Music className="h-4 w-4" />
            Tracks ({tracks.length})
          </TabsTrigger>
          <TabsTrigger value="artists" className="gap-2">
            <Users className="h-4 w-4" />
            Artists ({artists.length})
          </TabsTrigger>
          <TabsTrigger value="podcasts" className="gap-2">
            <Podcast className="h-4 w-4" />
            Podcasts ({podcasts.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Tracks Tab */}
        <TabsContent value="tracks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
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
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
            <CardContent>
              <Table>
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

        {/* Artists Tab */}
        <TabsContent value="artists">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Artists</CardTitle>
              <Dialog open={artistDialogOpen} onOpenChange={(open) => {
                setArtistDialogOpen(open);
                if (!open) {
                  setEditingArtist(null);
                  setArtistForm({ name: '', bio: '', image_url: '' });
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Artist
                  </Button>
                </DialogTrigger>
                <DialogContent>
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
                      <Label>Bio</Label>
                      <Textarea
                        value={artistForm.bio}
                        onChange={(e) => setArtistForm(p => ({ ...p, bio: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input
                        value={artistForm.image_url}
                        onChange={(e) => setArtistForm(p => ({ ...p, image_url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      {editingArtist ? 'Update' : 'Create'} Artist
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
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
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Podcast</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>RSS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {podcasts.map((podcast) => (
                    <TableRow key={podcast.id}>
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
                    </TableRow>
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
            <CardContent>
              <Table>
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
      </Tabs>
    </div>
  );
}
