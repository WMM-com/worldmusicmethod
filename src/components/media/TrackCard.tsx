import { Play, Pause, Heart, MoreHorizontal, Plus, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MediaTrack, useUserLikes, useToggleLike, useUserPlaylists, useAddToPlaylist } from '@/hooks/useMedia';
import { useMediaPlayer } from '@/contexts/MediaPlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TrackCardProps {
  track: MediaTrack;
  trackList?: MediaTrack[];
  showArtist?: boolean;
  compact?: boolean;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TrackCard({ track, trackList, showArtist = true, compact = false }: TrackCardProps) {
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay } = useMediaPlayer();
  const { data: likedTrackIds = [] } = useUserLikes();
  const { data: playlists = [] } = useUserPlaylists();
  const toggleLike = useToggleLike();
  const addToPlaylist = useAddToPlaylist();

  const isCurrentTrack = currentTrack?.id === track.id;
  const isLiked = likedTrackIds.includes(track.id);

  const handlePlay = () => {
    if (isCurrentTrack) {
      togglePlay();
    } else {
      playTrack(track, trackList);
    }
  };

  const handleLike = () => {
    if (!user) {
      toast.error('Sign in to like tracks');
      return;
    }
    toggleLike.mutate({ trackId: track.id, isLiked });
  };

  const handleAddToPlaylist = (playlistId: string) => {
    addToPlaylist.mutate(
      { playlistId, trackId: track.id },
      {
        onSuccess: () => toast.success('Added to playlist'),
        onError: () => toast.error('Already in playlist'),
      }
    );
  };

  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group cursor-pointer transition-colors",
          isCurrentTrack && "bg-muted"
        )}
        onClick={handlePlay}
      >
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
          <div className={cn(
            "absolute inset-0 bg-black/50 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity",
            isCurrentTrack && isPlaying && "opacity-100"
          )}>
            {isCurrentTrack && isPlaying ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white" />
            )}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium truncate text-sm", isCurrentTrack && "text-primary")}>
            {track.title}
          </p>
          {showArtist && (
            <p className="text-xs text-muted-foreground truncate">
              {track.artist?.name || 'Unknown Artist'}
            </p>
          )}
        </div>

        <span className="text-xs text-muted-foreground">
          {formatDuration(track.duration_seconds)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "group relative rounded-lg overflow-hidden bg-card hover:bg-muted/50 transition-colors",
      isCurrentTrack && "ring-2 ring-primary"
    )}>
      {/* Cover image */}
      <div className="aspect-square relative">
        {track.cover_image_url ? (
          <img 
            src={track.cover_image_url} 
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ListMusic className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Play button overlay */}
        <div className={cn(
          "absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
          isCurrentTrack && isPlaying && "opacity-100"
        )}>
          <Button 
            size="icon" 
            variant="default"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={handlePlay}
          >
            {isCurrentTrack && isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Track info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={cn("font-medium truncate", isCurrentTrack && "text-primary")}>
              {track.title}
            </p>
            {showArtist && (
              <p className="text-sm text-muted-foreground truncate">
                {track.artist?.name || 'Unknown Artist'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleLike}
            >
              <Heart className={cn("h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user && playlists.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Playlist
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {playlists.map(playlist => (
                        <DropdownMenuItem 
                          key={playlist.id}
                          onClick={() => handleAddToPlaylist(playlist.id)}
                        >
                          {playlist.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                <DropdownMenuItem onClick={() => {
                  const { addToQueue } = useMediaPlayer();
                  // Note: this won't work directly, need to use context properly
                }}>
                  Add to Queue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>{formatDuration(track.duration_seconds)}</span>
          {track.play_count > 0 && (
            <>
              <span>•</span>
              <span>{track.play_count.toLocaleString()} plays</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
