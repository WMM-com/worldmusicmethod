import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Shuffle, Repeat, Repeat1, Heart, ListMusic, ChevronUp, ChevronDown, Minimize2, Music, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useMediaPlayer } from '@/contexts/MediaPlayerContext';
import { useUserLikes, useToggleLike } from '@/hooks/useMedia';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function StickyAudioPlayer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { user } = useAuth();
  const { data: likedTrackIds = [] } = useUserLikes();
  const toggleLike = useToggleLike();
  const location = useLocation();

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffled,
    repeatMode,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    pause,
    closePlayer,
  } = useMediaPlayer();

  // Hide player inside courses (learn pages)
  const isInCourse = location.pathname.includes('/learn');

  // Dispatch custom events when minimized/expanded/visibility state changes
  useEffect(() => {
    const isVisible = !!currentTrack && !isInCourse;

    window.dispatchEvent(
      new CustomEvent('audio-player-state', {
        detail: { isMinimized, isExpanded, isVisible },
      })
    );
  }, [isMinimized, isExpanded, currentTrack, isInCourse]);

  // Notify listeners when the player is removed (on unmount)
  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent('audio-player-state', {
          detail: { isMinimized: true, isExpanded: false, isVisible: false },
        })
      );
    };
  }, []);

  // Listen for video play events to pause audio
  useEffect(() => {
    const handlePauseAudio = () => {
      if (isPlaying) {
        pause();
      }
    };

    window.addEventListener('pause-audio-player', handlePauseAudio);
    return () => {
      window.removeEventListener('pause-audio-player', handlePauseAudio);
    };
  }, [isPlaying, pause]);

  // Stop and hide player when entering a course
  useEffect(() => {
    if (isInCourse && isPlaying) {
      pause();
    }
  }, [isInCourse, isPlaying, pause]);

  // Don't render if no track, inside a course, or minimized with restore button
  if (!currentTrack || isInCourse) return null;

  const isLiked = likedTrackIds.includes(currentTrack.id);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleLike = () => {
    if (!user) return;
    toggleLike.mutate({ trackId: currentTrack.id, isLiked });
  };

  // Minimized restore button
  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
        size="icon"
      >
        <Music className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div
      data-chat-popup-obstacle="bottom"
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 transition-all duration-300",
        isExpanded ? "h-auto" : "h-20"
      )}
    >
      {/* Top progress bar with draggable thumb */}
      <div className="absolute top-0 left-0 right-0 -translate-y-1/2 px-2">
        <Slider
          value={[currentTime]}
          onValueChange={([v]) => seek(v)}
          max={duration || 100}
          step={0.1}
          variant="progress"
          className="w-full h-3"
        />
      </div>

      <div className="container mx-auto px-4 h-full">
        {/* Compact view */}
        <div className="flex items-center gap-2 sm:gap-4 h-20">
          {/* Track info - hide cover on mobile compact, show on expanded */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Cover image - hidden on mobile compact */}
            {currentTrack.cover_image_url ? (
              <img 
                src={currentTrack.cover_image_url} 
                alt={currentTrack.title}
                className="w-12 h-12 rounded object-cover hidden sm:block"
              />
            ) : (
              <div className="w-12 h-12 rounded bg-muted items-center justify-center hidden sm:flex">
                <ListMusic className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-sm sm:text-base">{currentTrack.title}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {currentTrack.artist?.name || 'Unknown Artist'}
              </p>
            </div>
          </div>

          {/* Center controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleShuffle}
              className={cn("hidden sm:flex h-8 w-8", isShuffled && "text-primary")}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={previous} className="h-8 w-8 sm:h-10 sm:w-10">
              <SkipBack className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button 
              variant="default" 
              size="icon" 
              onClick={togglePlay}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full"
            >
              {isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={next} className="h-8 w-8 sm:h-10 sm:w-10">
              <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={cycleRepeat}
              className={cn("hidden sm:flex h-8 w-8", repeatMode !== 'off' && "text-primary")}
            >
              {repeatMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </Button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end">
            {/* Time display - compact on mobile */}
            <span className="text-xs text-muted-foreground hidden sm:block">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            
            {user && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLike}
                className={cn("h-8 w-8 hidden sm:flex", isLiked && "text-red-500")}
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
              </Button>
            )}

            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={([v]) => setVolume(v / 100)}
                max={100}
                step={1}
                variant="volume"
                className="w-24"
              />
            </div>

            {/* Minimize button */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="hidden sm:flex h-8 w-8"
              title="Minimize player"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>

            {/* Close button */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={closePlayer}
              className="hidden sm:flex h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Close player"
            >
              <X className="h-4 w-4" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="md:hidden h-8 w-8"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded view (mobile) */}
        {isExpanded && (
          <div className="pb-6 pt-2 space-y-4 md:hidden">
            {/* Track info with cover image */}
            <div className="flex items-center gap-3">
              {currentTrack.cover_image_url ? (
                <img 
                  src={currentTrack.cover_image_url} 
                  alt={currentTrack.title}
                  className="w-16 h-16 rounded object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                  <ListMusic className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-lg">{currentTrack.title}</p>
                <p className="text-sm text-muted-foreground">
                  {currentTrack.artist?.name || 'Unknown Artist'}
                </p>
              </div>
              {user && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleLike}
                  className={cn(isLiked && "text-red-500")}
                >
                  <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                </Button>
              )}
            </div>

            {/* Seek bar with times */}
            <div className="space-y-2">
              <Slider
                value={[currentTime]}
                onValueChange={([v]) => seek(v)}
                max={duration || 100}
                step={0.1}
                variant="progress"
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Extra controls */}
            <div className="flex justify-center items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleShuffle}
                className={cn(isShuffled && "text-primary")}
              >
                <Shuffle className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={cycleRepeat}
                className={cn(repeatMode !== 'off' && "text-primary")}
              >
                {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={toggleMute}>
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={([v]) => setVolume(v / 100)}
                  max={100}
                  step={1}
                  variant="volume"
                  className="w-24"
                />
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsMinimized(true)}
                title="Minimize player"
              >
                <Minimize2 className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={closePlayer}
                className="text-muted-foreground hover:text-destructive"
                title="Close player"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export the player height for use in other components
export const STICKY_PLAYER_HEIGHT = 80;
