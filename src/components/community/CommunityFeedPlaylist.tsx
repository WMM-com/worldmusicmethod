import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, ListMusic } from 'lucide-react';
import { useCommunityFeedPlaylist } from '@/hooks/useMedia';
import { useMediaPlayer } from '@/contexts/MediaPlayerContext';
import { PlaylistCoverGrid } from '@/components/media/PlaylistCoverGrid';
import { Skeleton } from '@/components/ui/skeleton';

export function CommunityFeedPlaylist() {
  const navigate = useNavigate();
  const { data: playlist, isLoading } = useCommunityFeedPlaylist();
  const { playTrack } = useMediaPlayer();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-square rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!playlist) {
    return null;
  }

  const coverUrls = playlist.tracks?.slice(0, 4).map(t => t.cover_image_url) || [];

  const handlePlay = () => {
    if (playlist.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ListMusic className="h-4 w-4" />
          Featured Playlist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div 
          className="cursor-pointer group"
          onClick={() => navigate(`/music/playlist/${playlist.id}`)}
        >
          <div className="relative">
            <PlaylistCoverGrid coverUrls={coverUrls} size="lg" className="w-full aspect-square" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <Button 
                size="icon" 
                variant="default"
                className="h-12 w-12 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay();
                }}
              >
                <Play className="h-6 w-6 ml-0.5" />
              </Button>
            </div>
          </div>
          <h3 className="font-semibold mt-2 truncate">{playlist.name}</h3>
          {playlist.description && (
            <p className="text-xs text-muted-foreground truncate">{playlist.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {playlist.tracks?.length || 0} tracks
          </p>
        </div>
      </CardContent>
    </Card>
  );
}