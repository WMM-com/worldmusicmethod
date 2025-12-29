import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Shuffle, Repeat, Repeat1, Heart, ListMusic, ChevronUp, ChevronDown, Minimize2, Music
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
  } = useMediaPlayer();

  // Hide player inside courses (learn pages)
  const isInCourse = location.pathname.includes('/learn');

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
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 transition-all duration-300",
      isExpanded ? "h-auto" : "h-20"
    )}>
      {/* Clickable progress bar (thin line at top) */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 bg-muted cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const percentage = clickX / rect.width;
          seek(percentage * duration);
        }}
      >
        <div 
          className="h-full bg-primary transition-all duration-100 group-hover:bg-primary/80"
          style={{ width: `${progress}%` }}
        />
        {/* Hover indicator */}
        <div className="absolute top-0 left-0 right-0 h-2 -mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="container mx-auto px-4 h-full">
        {/* Compact view */}
        <div className="flex items-center gap-4 h-20">
          {/* Track info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {currentTrack.cover_image_url ? (
              <img 
                src={currentTrack.cover_image_url} 
                alt={currentTrack.title}
                className="w-12 h-12 rounded object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                <ListMusic className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium truncate">{currentTrack.title}</p>
              <p className="text-sm text-muted-foreground truncate">
                {currentTrack.artist?.name || 'Unknown Artist'}
              </p>
            </div>
          </div>

          {/* Center controls */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleShuffle}
              className={cn("hidden sm:flex", isShuffled && "text-primary")}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={previous}>
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button 
              variant="default" 
              size="icon" 
              onClick={togglePlay}
              className="h-10 w-10 rounded-full"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={next}>
              <SkipForward className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={cycleRepeat}
              className={cn("hidden sm:flex", repeatMode !== 'off' && "text-primary")}
            >
              {repeatMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </Button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Desktop seek bar */}
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                onValueChange={([v]) => seek(v)}
                max={duration || 100}
                className="w-32"
              />
              <span className="text-xs text-muted-foreground w-10">
                {formatTime(duration)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground hidden md:block lg:hidden">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            
            {user && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLike}
                className={cn(isLiked && "text-red-500")}
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
              </Button>
            )}

            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={([v]) => setVolume(v / 100)}
                max={100}
                className="w-24"
              />
            </div>

            {/* Minimize button */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="hidden sm:flex"
              title="Minimize player"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="md:hidden"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded view (mobile) */}
        {isExpanded && (
          <div className="pb-6 pt-2 space-y-4 md:hidden">
            {/* Seek bar */}
            <div className="space-y-2">
              <Slider
                value={[currentTime]}
                onValueChange={([v]) => seek(v)}
                max={duration || 100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Extra controls */}
            <div className="flex justify-center gap-4">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export the player height for use in other components
export const STICKY_PLAYER_HEIGHT = 80;
