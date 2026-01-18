import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Mic, Heart, ListMusic, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useTracks, usePodcasts, useUserPlaylists, useLikedTracks, useAdminPlaylists, MediaPodcast, usePlaylist } from '@/hooks/useMedia';
import { TrackList } from '@/components/media/TrackList';
import { MediaSearch } from '@/components/media/MediaSearch';
import { CreatePlaylistDialog } from '@/components/media/CreatePlaylistDialog';
import { PlaylistCoverGrid } from '@/components/media/PlaylistCoverGrid';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function Media() {
  const [activeTab, setActiveTab] = useState('browse');
  const [expandedPodcast, setExpandedPodcast] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: songs, isLoading: songsLoading } = useTracks('song');
  const { data: podcasts, isLoading: podcastsLoading } = useTracks('podcast_episode');
  const { data: podcastFeeds } = usePodcasts();
  const { data: playlists, isLoading: playlistsLoading } = useUserPlaylists();
  const { data: likedTracks, isLoading: likedLoading } = useLikedTracks();
  const { data: adminPlaylists, isLoading: adminPlaylistsLoading } = useAdminPlaylists();

  useEffect(() => {
    document.title = 'Listen | World Music Method';
  }, []);

  // Get episodes for a specific podcast
  const getEpisodesForPodcast = (podcastId: string) => {
    return podcasts?.filter(ep => ep.podcast_id === podcastId) || [];
  };

  // Get diverse recent songs - max 1 per artist to avoid artist-heavy display
  const getDiverseRecentSongs = () => {
    if (!songs) return [];
    const seenArtists = new Set<string>();
    const diverseTracks: typeof songs = [];
    
    for (const song of songs) {
      const artistId = song.artist_id || 'unknown';
      if (!seenArtists.has(artistId)) {
        seenArtists.add(artistId);
        diverseTracks.push(song);
      }
      if (diverseTracks.length >= 8) break;
    }
    return diverseTracks;
  };

  // Get cover URLs for a playlist
  const getPlaylistCoverUrls = (playlistId: string, tracks: any[] | undefined) => {
    return tracks?.slice(0, 4).map(t => t.cover_image_url) || [];
  };

  return (
    <>
      <SiteHeader />
      <div className="container py-8 pb-28 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Listen</h1>
            <p className="text-muted-foreground">Stream music and podcasts</p>
          </div>
          {user && <CreatePlaylistDialog />}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid bg-accent/20">
            <TabsTrigger value="browse" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Browse</span>
            </TabsTrigger>
            <TabsTrigger value="songs" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Music className="h-4 w-4" />
              <span className="hidden sm:inline">Songs</span>
            </TabsTrigger>
            <TabsTrigger value="podcasts" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">Podcasts</span>
            </TabsTrigger>
            <TabsTrigger value="playlists" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <ListMusic className="h-4 w-4" />
              <span className="hidden sm:inline">Playlists</span>
            </TabsTrigger>
            <TabsTrigger value="liked" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Liked</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-8">
            <MediaSearch />

            {/* Recent Songs */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recent Songs</h2>
                <Button variant="link" onClick={() => setActiveTab('songs')}>
                  View all
                </Button>
              </div>
              {songsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : songs && songs.length > 0 ? (
                <TrackList tracks={getDiverseRecentSongs()} variant="featured" />
              ) : (
                <p className="text-muted-foreground">No songs available yet</p>
              )}
            </section>

            {/* Recent Podcasts */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recent Podcasts</h2>
                <Button variant="link" onClick={() => setActiveTab('podcasts')}>
                  View all
                </Button>
              </div>
              {podcastsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : podcasts && podcasts.length > 0 ? (
                <TrackList tracks={podcasts.slice(0, 6)} />
              ) : (
                <p className="text-muted-foreground">No podcasts available yet</p>
              )}
            </section>
          </TabsContent>

          <TabsContent value="songs" className="space-y-6">
            <h2 className="text-xl font-semibold">All Songs</h2>
            {songsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : songs && songs.length > 0 ? (
              <TrackList tracks={songs} variant="list" />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No songs available yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="podcasts" className="space-y-6">
            {/* Podcast Shows */}
            {podcastFeeds && podcastFeeds.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Shows</h2>
                <div className="space-y-4">
                  {podcastFeeds.map(podcast => {
                    const episodes = getEpisodesForPodcast(podcast.id);
                    const isExpanded = expandedPodcast === podcast.id;
                    
                    return (
                      <Collapsible 
                        key={podcast.id} 
                        open={isExpanded}
                        onOpenChange={(open) => setExpandedPodcast(open ? podcast.id : null)}
                      >
                        <Card className="overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-4">
                                {podcast.cover_image_url ? (
                                  <img 
                                    src={podcast.cover_image_url} 
                                    alt={podcast.title}
                                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                    <Mic className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold">{podcast.title}</h3>
                                  <p className="text-sm text-muted-foreground truncate">{podcast.author}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <Button variant="ghost" size="icon">
                                  {isExpanded ? (
                                    <ChevronUp className="h-5 w-5" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5" />
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t border-border px-4 py-2">
                              {episodes.length > 0 ? (
                                <TrackList tracks={episodes} compact />
                              ) : (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                  No episodes available
                                </p>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              </section>
            )}

          </TabsContent>

          <TabsContent value="playlists" className="space-y-6">
            {/* Admin Playlists */}
            {(adminPlaylists && adminPlaylists.length > 0) && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Featured Playlists</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {adminPlaylists.map(playlist => (
                    <AdminPlaylistCard key={playlist.id} playlist={playlist} />
                  ))}
                </div>
              </section>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Playlists</h2>
              {user && <CreatePlaylistDialog />}
            </div>

            {!user ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ListMusic className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Sign in to create and manage playlists</p>
                  <Button onClick={() => navigate('/auth')}>Sign In</Button>
                </CardContent>
              </Card>
            ) : playlistsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : playlists && playlists.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {playlists.map(playlist => (
                  <UserPlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <ListMusic className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">You haven't created any playlists yet</p>
                  <CreatePlaylistDialog />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="liked" className="space-y-6">
            <h2 className="text-xl font-semibold">Liked Songs</h2>

            {!user ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Sign in to see your liked songs</p>
                  <Button onClick={() => navigate('/auth')}>Sign In</Button>
                </CardContent>
              </Card>
            ) : likedLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : likedTracks && likedTracks.length > 0 ? (
              <TrackList tracks={likedTracks} variant="liked" />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Songs you like will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// Component for admin playlist cards with auto-generated cover
function AdminPlaylistCard({ playlist }: { playlist: any }) {
  const navigate = useNavigate();
  const { data: fullPlaylist } = usePlaylist(playlist.id);
  
  const coverUrls = fullPlaylist?.tracks?.slice(0, 4).map(t => t.cover_image_url) || [];
  
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => navigate(`/listen/playlist/${playlist.id}`)}
    >
      <CardContent className="p-4">
        <PlaylistCoverGrid 
          coverUrls={coverUrls} 
          size="lg" 
          className="w-full mb-3" 
        />
        <h3 className="font-semibold truncate">{playlist.name}</h3>
        {playlist.description && (
          <p className="text-sm text-muted-foreground truncate">{playlist.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Component for user playlist cards with auto-generated cover
function UserPlaylistCard({ playlist }: { playlist: any }) {
  const navigate = useNavigate();
  const { data: fullPlaylist } = usePlaylist(playlist.id);
  
  const coverUrls = fullPlaylist?.tracks?.slice(0, 4).map(t => t.cover_image_url) || [];
  
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => navigate(`/listen/playlist/${playlist.id}`)}
    >
      <CardContent className="p-4">
        <PlaylistCoverGrid 
          coverUrls={coverUrls} 
          size="lg" 
          className="w-full mb-3" 
        />
        <h3 className="font-semibold truncate">{playlist.name}</h3>
        {playlist.description && (
          <p className="text-sm text-muted-foreground truncate">{playlist.description}</p>
        )}
      </CardContent>
    </Card>
  );
}
