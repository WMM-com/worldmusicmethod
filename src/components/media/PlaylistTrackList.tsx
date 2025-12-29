import { Play, Pause, Trash2, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaTrack, useRemoveFromPlaylist } from '@/hooks/useMedia';
import { useMediaPlayer } from '@/contexts/MediaPlayerContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PlaylistTrackListProps {
  tracks: MediaTrack[];
  playlistId: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PlaylistTrackList({ tracks, playlistId }: PlaylistTrackListProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useMediaPlayer();
  const removeFromPlaylist = useRemoveFromPlaylist();

  const handlePlay = (track: MediaTrack) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, tracks);
    }
  };

  const handleRemove = (track: MediaTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromPlaylist.mutate(
      { playlistId, trackId: track.id },
      {
        onSuccess: () => toast.success('Removed from playlist'),
        onError: () => toast.error('Failed to remove from playlist'),
      }
    );
  };

  return (
    <div className="space-y-1">
      {tracks.map((track, index) => {
        const isCurrentTrack = currentTrack?.id === track.id;
        
        return (
          <div 
            key={track.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group cursor-pointer transition-colors",
              isCurrentTrack && "bg-muted"
            )}
            onClick={() => handlePlay(track)}
          >
            {/* Track number / Play indicator */}
            <div className="w-6 text-center text-sm text-muted-foreground">
              <span className="group-hover:hidden">
                {isCurrentTrack && isPlaying ? (
                  <span className="text-primary">▶</span>
                ) : (
                  index + 1
                )}
              </span>
              <span className="hidden group-hover:inline">
                {isCurrentTrack && isPlaying ? (
                  <Pause className="h-4 w-4 inline" />
                ) : (
                  <Play className="h-4 w-4 inline" />
                )}
              </span>
            </div>

            {/* Cover */}
            <div className="relative w-10 h-10 flex-shrink-0">
              {track.cover_image_url ? (
                <img 
                  src={track.cover_image_url} 
                  alt={track.title}
                  className="w-full h-full rounded object-cover"
                />
              ) : (
                <div className="w-full h-full rounded bg-muted flex items-center justify-center">
                  <ListMusic className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
            
            {/* Title and artist */}
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium truncate text-sm", isCurrentTrack && "text-primary")}>
                {track.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {track.artist?.name || 'Unknown Artist'}
              </p>
            </div>

            {/* Duration */}
            <span className="text-xs text-muted-foreground">
              {formatDuration(track.duration_seconds)}
            </span>

            {/* Remove button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => handleRemove(track, e)}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
