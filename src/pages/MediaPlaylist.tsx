import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, Play, Shuffle, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaylist, useRemoveFromPlaylist } from '@/hooks/useMedia';
import { useMediaPlayer } from '@/contexts/MediaPlayerContext';
import { TrackList } from '@/components/media/TrackList';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function MediaPlaylist() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const { playTrack } = useMediaPlayer();
  const { data: playlist, isLoading } = usePlaylist(playlistId || '');
  const removeFromPlaylist = useRemoveFromPlaylist();

  if (isLoading) {
    return (
      <div className="container py-8 pb-28 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-6">
          <Skeleton className="w-48 h-48 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="container py-8 text-center">
        <p className="text-muted-foreground">Playlist not found</p>
        <Button variant="link" onClick={() => navigate('/media')}>
          Back to Media
        </Button>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (playlist.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  const handleShuffle = () => {
    if (playlist.tracks && playlist.tracks.length > 0) {
      const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  useEffect(() => {
    document.title = `${playlist.name} | Media Library`;
  }, [playlist.name]);

  return (
    <>

      <div className="container py-8 pb-28 space-y-8">
        <Button variant="ghost" onClick={() => navigate('/media')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Media
        </Button>

        {/* Playlist header */}
        <div className="flex flex-col md:flex-row items-start gap-6">
          {playlist.cover_image_url ? (
            <img 
              src={playlist.cover_image_url} 
              alt={playlist.name}
              className="w-48 h-48 rounded-lg object-cover shadow-lg"
            />
          ) : (
            <div className="w-48 h-48 rounded-lg bg-muted flex items-center justify-center shadow-lg">
              <ListMusic className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Playlist</p>
              <h1 className="text-3xl font-bold">{playlist.name}</h1>
              {playlist.description && (
                <p className="text-muted-foreground mt-2">{playlist.description}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {playlist.tracks?.length || 0} tracks
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handlePlayAll} disabled={!playlist.tracks?.length}>
                <Play className="h-4 w-4 mr-2" />
                Play All
              </Button>
              <Button variant="outline" onClick={handleShuffle} disabled={!playlist.tracks?.length}>
                <Shuffle className="h-4 w-4 mr-2" />
                Shuffle
              </Button>
            </div>
          </div>
        </div>

        {/* Tracks */}
        {playlist.tracks && playlist.tracks.length > 0 ? (
          <TrackList tracks={playlist.tracks} compact />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ListMusic className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>This playlist is empty</p>
            <p className="text-sm">Add some tracks to get started</p>
          </div>
        )}
      </div>
    </>
  );
}
