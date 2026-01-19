import { MediaTrack, MediaArtist } from '@/hooks/useMedia';
import { TrackCard } from './TrackCard';
import { Play, Pause, Heart, MoreHorizontal, ListPlus, Plus, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useMediaPlayer } from '@/contexts/MediaPlayerContext';
import { useUserLikes, useToggleLike, useUserPlaylists, useAddToPlaylist } from '@/hooks/useMedia';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

// Artist link component for clickable artist names
function ArtistLink({ artist }: { artist?: MediaArtist }) {
  if (!artist) return <span>Unknown Artist</span>;
  
  const slug = artist.slug || artist.id;
  
  return (
    <Link 
      to={`/listen/artist/${slug}`}
      className="hover:underline hover:text-foreground transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      {artist.name}
    </Link>
  );
}
interface TrackListProps {
  tracks: MediaTrack[];
  showArtist?: boolean;
  compact?: boolean;
  variant?: 'grid' | 'list' | 'featured' | 'compact' | 'liked';
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// List row component for better UX when viewing many tracks
// Liked Track Row - displays heart prominently for easy unliking
function LikedTrackRow({ track, trackList, index, showArtist = true }: { track: MediaTrack; trackList: MediaTrack[]; index: number; showArtist?: boolean }) {
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } = useMediaPlayer();
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

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Sign in to like tracks');
      return;
    }
    toggleLike.mutate({ trackId: track.id, isLiked });
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
    toast.success('Added to queue');
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

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-2 pr-3 rounded-lg hover:bg-muted/50 group cursor-pointer transition-colors border border-transparent hover:border-border/50",
        isCurrentTrack && "bg-muted border-primary/30"
      )}
      onClick={handlePlay}
    >
      {/* Index number */}
      <span className="text-sm text-muted-foreground w-6 text-right flex-shrink-0">
        {index + 1}
      </span>

      {/* Cover art */}
      <div className="relative w-10 h-10 flex-shrink-0 rounded-md overflow-hidden">
        {track.cover_image_url ? (
          <img 
            src={track.cover_image_url} 
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ListMusic className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className={cn(
          "absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
          isCurrentTrack && isPlaying && "opacity-100"
        )}>
          {isCurrentTrack && isPlaying ? (
            <Pause className="h-4 w-4 text-white" />
          ) : (
            <Play className="h-4 w-4 text-white" />
          )}
        </div>
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm truncate",
          isCurrentTrack && "text-primary"
        )}>
          {track.title}
        </p>
        {showArtist && (
          <p className="text-xs text-muted-foreground truncate">
            <ArtistLink artist={track.artist} />
          </p>
        )}
      </div>

      {/* Duration */}
      <span className="text-xs text-muted-foreground tabular-nums hidden sm:block">
        {formatDuration(track.duration_seconds)}
      </span>

      {/* Heart icon - always visible for easy unliking */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 flex-shrink-0"
        onClick={handleLike}
      >
        <Heart className={cn("h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
      </Button>

      {/* More actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleAddToQueue}>
            <ListPlus className="h-4 w-4 mr-2" />
            Add to Queue
          </DropdownMenuItem>
          {user && playlists.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Playlist
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-40">
                  {playlists.map(playlist => (
                    <DropdownMenuItem 
                      key={playlist.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToPlaylist(playlist.id);
                      }}
                    >
                      {playlist.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function TrackListRow({ track, trackList, showArtist = true }: { track: MediaTrack; trackList: MediaTrack[]; showArtist?: boolean }) {
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } = useMediaPlayer();
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

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Sign in to like tracks');
      return;
    }
    toggleLike.mutate({ trackId: track.id, isLiked });
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
    toast.success('Added to queue');
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

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-2 pr-3 rounded-lg hover:bg-muted/50 group cursor-pointer transition-colors border border-transparent hover:border-border/50",
        isCurrentTrack && "bg-muted border-primary/30"
      )}
      onClick={handlePlay}
    >
      {/* Cover art */}
      <div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden">
        {track.cover_image_url ? (
          <img 
            src={track.cover_image_url} 
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ListMusic className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className={cn(
          "absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
          isCurrentTrack && isPlaying && "opacity-100"
        )}>
          {isCurrentTrack && isPlaying ? (
            <Pause className="h-5 w-5 text-white" />
          ) : (
            <Play className="h-5 w-5 text-white" />
          )}
        </div>
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto] gap-4 items-center">
        <div className="min-w-0">
          <p className={cn(
            "font-medium text-sm truncate",
            isCurrentTrack && "text-primary"
          )}>
            {track.title}
          </p>
          {showArtist && (
            <p className="text-xs text-muted-foreground truncate">
              <ArtistLink artist={track.artist} />
              {track.album_name && <span className="opacity-70"> • {track.album_name}</span>}
            </p>
          )}
        </div>

        {/* Country/Genre tag */}
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          {track.country && (
            <span className="px-2 py-0.5 bg-muted rounded-full">{track.country}</span>
          )}
          {track.genre && (
            <span className="px-2 py-0.5 bg-muted rounded-full">{track.genre}</span>
          )}
        </div>

        {/* Duration */}
        <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
          {formatDuration(track.duration_seconds)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={handleLike}
        >
          <Heart className={cn("h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleAddToQueue}>
              <ListPlus className="h-4 w-4 mr-2" />
              Add to Queue
            </DropdownMenuItem>
            {user && playlists.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Playlist
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40">
                    {playlists.map(playlist => (
                      <DropdownMenuItem 
                        key={playlist.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToPlaylist(playlist.id);
                        }}
                      >
                        {playlist.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function TrackList({ tracks, showArtist = true, compact = false, variant = 'grid' }: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No tracks found
      </div>
    );
  }

  // Liked mode - shows heart icon for easy unliking
  if (variant === 'liked') {
    return (
      <div className="space-y-1">
        {tracks.map((track, index) => (
          <LikedTrackRow 
            key={track.id} 
            track={track} 
            trackList={tracks}
            index={index}
            showArtist={showArtist}
          />
        ))}
      </div>
    );
  }

  // Compact mode (for playlists)
  if (compact || variant === 'compact') {
    return (
      <div className="space-y-1">
        {tracks.map((track, index) => (
          <div key={track.id} className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-6 text-right">
              {index + 1}
            </span>
            <div className="flex-1">
              <TrackCard 
                track={track} 
                trackList={tracks}
                showArtist={showArtist} 
                compact 
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // List mode - clean table-like layout
  if (variant === 'list') {
    return (
      <div className="space-y-1">
        {tracks.map(track => (
          <TrackListRow 
            key={track.id} 
            track={track} 
            trackList={tracks}
            showArtist={showArtist} 
          />
        ))}
      </div>
    );
  }

  // Featured mode - horizontal scrolling cards with larger images
  if (variant === 'featured') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {tracks.map(track => (
          <TrackCard 
            key={track.id} 
            track={track} 
            trackList={tracks}
            showArtist={showArtist}
          />
        ))}
      </div>
    );
  }

  // Default grid mode
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {tracks.map(track => (
        <TrackCard 
          key={track.id} 
          track={track} 
          trackList={tracks}
          showArtist={showArtist}
        />
      ))}
    </div>
  );
}