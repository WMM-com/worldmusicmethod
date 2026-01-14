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
          {/* Track info with cover image */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Cover image - always show, smaller on mobile */}
            {currentTrack.cover_image_url ? (
              <img 
                src={currentTrack.cover_image_url} 
                alt={currentTrack.title}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                <ListMusic className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-xs sm:text-base">{currentTrack.title}</p>
              <p className="text-[10px] sm:text-sm text-muted-foreground truncate">
                {currentTrack.artist?.name || 'Unknown Artist'}
              </p>
            </div>
          </div>

          {/* Playback controls - positioned right on mobile */}
          <div className="flex items-center gap-0.5 sm:gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleShuffle}
              className={cn("hidden sm:flex h-8 w-8", isShuffled && "text-primary")}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={previous} className="h-7 w-7 sm:h-10 sm:w-10">
              <SkipBack className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </Button>
            <Button 
              variant="default" 
              size="icon" 
              onClick={togglePlay}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5 sm:h-5 sm:w-5" /> : <Play className="h-3.5 w-3.5 sm:h-5 sm:w-5 ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={next} className="h-7 w-7 sm:h-10 sm:w-10">
              <SkipForward className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
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

          {/* Right controls - desktop extras + expand chevron */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Time display - desktop only */}
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

            {/* Minimize button - desktop only */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="hidden sm:flex h-8 w-8"
              title="Minimize player"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>

            {/* Close button - desktop only */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={closePlayer}
              className="hidden sm:flex h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Close player"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Expand/collapse chevron - mobile only */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="md:hidden h-7 w-7"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded view (mobile) - only extra controls, no duplicate track info */}
        {isExpanded && (
          <div className="pb-4 pt-2 md:hidden">
            {/* Time display */}
            <div className="flex justify-between text-xs text-muted-foreground px-2 mb-3">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
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
