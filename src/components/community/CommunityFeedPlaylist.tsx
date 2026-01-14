import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, ListMusic, Pause } from 'lucide-react';
import { useCommunityFeedPlaylist } from '@/hooks/useMedia';
import { useMediaPlayer } from '@/contexts/MediaPlayerContext';
import { PlaylistCoverGrid } from '@/components/media/PlaylistCoverGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function CommunityFeedPlaylist() {
  const navigate = useNavigate();
  const { data: playlist, isLoading } = useCommunityFeedPlaylist();
  const { playTrack, currentTrack, isPlaying, togglePlay } = useMediaPlayer();

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

  const handlePlayPlaylist = () => {
    if (playlist.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  const handlePlayTrack = (track: any, index: number) => {
    if (playlist.tracks) {
      playTrack(track, playlist.tracks.slice(index));
    }
  };

  const isTrackPlaying = (trackId: string) => {
    return currentTrack?.id === trackId && isPlaying;
  };

  const isCurrentTrack = (trackId: string) => {
    return currentTrack?.id === trackId;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ListMusic className="h-4 w-4" />
          Playlist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Playlist Cover and Title */}
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
                  handlePlayPlaylist();
                }}
              >
                <Play className="h-6 w-6 ml-0.5" />
              </Button>
            </div>
          </div>
          <h3 className="font-semibold mt-2 text-sm">{playlist.name}</h3>
          {playlist.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{playlist.description}</p>
          )}
        </div>

        {/* Track List */}
        {playlist.tracks && playlist.tracks.length > 0 && (
          <ScrollArea className="h-[200px]">
            <div className="space-y-1 pr-2">
              {playlist.tracks.map((track, index) => (
                <div
                  key={track.id}
                  className={cn(
                    "flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-colors group/track",
                    isCurrentTrack(track.id) 
                      ? "bg-primary/10" 
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => {
                    if (isCurrentTrack(track.id)) {
                      togglePlay();
                    } else {
                      handlePlayTrack(track, index);
                    }
                  }}
                >
                  {/* Track Number / Play Button */}
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {isTrackPlaying(track.id) ? (
                      <Pause className="h-3 w-3 text-primary" />
                    ) : isCurrentTrack(track.id) ? (
                      <Play className="h-3 w-3 text-primary ml-0.5" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground group-hover/track:hidden">
                        {index + 1}
                      </span>
                    )}
                    {!isCurrentTrack(track.id) && (
                      <Play className="h-3 w-3 hidden group-hover/track:block ml-0.5" />
                    )}
                  </div>

                  {/* Track Cover */}
                  <div className="h-8 w-8 rounded overflow-hidden shrink-0 bg-muted">
                    {track.cover_image_url ? (
                      <img 
                        src={track.cover_image_url} 
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ListMusic className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs truncate",
                      isCurrentTrack(track.id) ? "text-primary font-medium" : ""
                    )}>
                      {track.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {track.artist?.name || 'Unknown Artist'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          {playlist.tracks?.length || 0} tracks
        </p>
      </CardContent>
    </Card>
  );
}
