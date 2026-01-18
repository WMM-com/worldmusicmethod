import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { MediaTrack, useRecordPlay } from '@/hooks/useMedia';
import { usePlayTracking } from '@/hooks/usePlayTracking';

interface MediaPlayerContextType {
  currentTrack: MediaTrack | null;
  queue: MediaTrack[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  playTrackingState: ReturnType<ReturnType<typeof usePlayTracking>['getTrackingState']>;
  
  playTrack: (track: MediaTrack, trackList?: MediaTrack[]) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: MediaTrack) => void;
  clearQueue: () => void;
  closePlayer: () => void;
}

const MediaPlayerContext = createContext<MediaPlayerContextType | undefined>(undefined);

export function useMediaPlayer() {
  const context = useContext(MediaPlayerContext);
  if (!context) {
    throw new Error('useMediaPlayer must be used within MediaPlayerProvider');
  }
  return context;
}

export function MediaPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<MediaTrack | null>(null);
  const [queue, setQueue] = useState<MediaTrack[]>([]);
  const [originalQueue, setOriginalQueue] = useState<MediaTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [sessionId] = useState(() => crypto.randomUUID());
  const [playRecorded, setPlayRecorded] = useState(false);
  const [playTrackingState, setPlayTrackingState] = useState<ReturnType<ReturnType<typeof usePlayTracking>['getTrackingState']>>(null);

  const recordPlay = useRecordPlay();
  
  // Play tracking for credits system
  const { 
    startTracking, 
    updatePlayTime, 
    finalizeTracking, 
    resetTracking,
    getTrackingState 
  } = usePlayTracking();

  // Ref to hold the latest handleTrackEnd function
  const handleTrackEndRef = useRef<() => void>(() => {});
  
  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Update play tracking with actual playback time
      updatePlayTime(audio.currentTime, !audio.paused);
      // Update tracking state for UI
      setPlayTrackingState(getTrackingState());
    };
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => handleTrackEndRef.current();
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [updatePlayTime, getTrackingState]);

  // Record play after 30 seconds or 50% of track (legacy system - keep for backwards compatibility)
  useEffect(() => {
    if (!currentTrack || playRecorded) return;

    const threshold = Math.min(30, (duration || 60) * 0.5);
    
    if (currentTime >= threshold) {
      recordPlay.mutate({
        trackId: currentTrack.id,
        durationPlayed: Math.floor(currentTime),
        completed: false,
        sessionId,
      });
      setPlayRecorded(true);
    }
  }, [currentTime, currentTrack, duration, playRecorded, sessionId]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const playTrackAtIndex = useCallback(async (index: number) => {
    if (index < 0 || index >= queue.length) return;
    
    // Finalize tracking for current track before switching
    await finalizeTracking();
    
    const track = queue[index];
    setCurrentTrack(track);
    setCurrentIndex(index);
    setPlayRecorded(false);
    
    // Start tracking new track
    startTracking(
      track.id, 
      track.content_type || 'song',
      track.duration_seconds || 0
    );
    
    if (audioRef.current) {
      audioRef.current.src = track.audio_url;
      audioRef.current.play().catch(console.error);
    }
  }, [queue, finalizeTracking, startTracking]);

  const handleTrackEnd = useCallback(async () => {
    if (!currentTrack) return;

    // Finalize play tracking (registers credits)
    await finalizeTracking();

    // Record completed play (legacy system)
    recordPlay.mutate({
      trackId: currentTrack.id,
      durationPlayed: Math.floor(duration),
      completed: true,
      sessionId,
    });

    if (repeatMode === 'one') {
      // Repeat the same track - start fresh tracking
      startTracking(
        currentTrack.id,
        currentTrack.content_type || 'song',
        currentTrack.duration_seconds || 0
      );
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (currentIndex < queue.length - 1) {
      // Play next track in queue
      playTrackAtIndex(currentIndex + 1);
    } else if (repeatMode === 'all' && queue.length > 0) {
      // Repeat the entire queue from the beginning
      playTrackAtIndex(0);
    } else {
      // End of queue with no repeat - just stop
      setIsPlaying(false);
      resetTracking();
    }
  }, [currentTrack, currentIndex, queue, repeatMode, duration, sessionId, playTrackAtIndex, finalizeTracking, startTracking, resetTracking]);

  // Keep the ref updated with the latest handleTrackEnd
  useEffect(() => {
    handleTrackEndRef.current = handleTrackEnd;
  }, [handleTrackEnd]);

  const playTrack = useCallback(async (track: MediaTrack, trackList?: MediaTrack[]) => {
    // Finalize tracking for previous track before starting new one
    await finalizeTracking();
    
    // If trackList is provided, use it as the new queue
    // If not provided, keep existing queue and add track if not already in it
    let newQueue: MediaTrack[];
    let newIndex: number;
    
    if (trackList) {
      // A track list was provided - use it as the new queue
      newQueue = trackList;
      newIndex = trackList.findIndex(t => t.id === track.id);
      if (newIndex === -1) newIndex = 0;
      setOriginalQueue(newQueue);
      
      if (isShuffled) {
        const shuffled = shuffleArray(newQueue.filter(t => t.id !== track.id));
        newQueue = [track, ...shuffled];
        newIndex = 0;
      }
      
      setQueue(newQueue);
    } else {
      // No track list - check if track is already in queue
      const existingIndex = queue.findIndex(t => t.id === track.id);
      
      if (existingIndex >= 0) {
        // Track already in queue, just play it at that position
        newIndex = existingIndex;
        newQueue = queue;
      } else if (queue.length === 0) {
        // Empty queue - start fresh with this track
        newQueue = [track];
        newIndex = 0;
        setQueue(newQueue);
        setOriginalQueue(newQueue);
      } else {
        // Track not in queue but queue has items - insert after current and play
        const insertPosition = currentIndex + 1;
        newQueue = [...queue.slice(0, insertPosition), track, ...queue.slice(insertPosition)];
        newIndex = insertPosition;
        setQueue(newQueue);
        setOriginalQueue(prev => {
          const origInsertPos = prev.findIndex(t => t.id === queue[currentIndex]?.id);
          if (origInsertPos >= 0) {
            return [...prev.slice(0, origInsertPos + 1), track, ...prev.slice(origInsertPos + 1)];
          }
          return [...prev, track];
        });
      }
    }
    
    setCurrentTrack(track);
    setCurrentIndex(newIndex);
    setPlayRecorded(false);
    
    // Start tracking new track
    startTracking(
      track.id,
      track.content_type || 'song',
      track.duration_seconds || 0
    );
    
    if (audioRef.current) {
      audioRef.current.src = track.audio_url;
      audioRef.current.play().catch(console.error);
    }
  }, [isShuffled, queue, currentIndex, finalizeTracking, startTracking]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    // Dispatch event to pause any playing videos before resuming audio
    window.dispatchEvent(new CustomEvent('pause-all-videos'));
    audioRef.current?.play().catch(console.error);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, pause, resume]);

  const next = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      playTrackAtIndex(currentIndex + 1);
    } else if (repeatMode === 'all') {
      playTrackAtIndex(0);
    }
  }, [currentIndex, queue.length, repeatMode, playTrackAtIndex]);

  const previous = useCallback(() => {
    if (currentTime > 3) {
      seek(0);
    } else if (currentIndex > 0) {
      playTrackAtIndex(currentIndex - 1);
    }
  }, [currentIndex, currentTime, playTrackAtIndex]);

  // Track whether we were playing before seeking (to avoid scratch sound)
  const wasPlayingBeforeSeek = useRef(false);
  const seekTimeoutRef = useRef<number | null>(null);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      // On first seek action, pause if playing to prevent scratching
      if (!wasPlayingBeforeSeek.current && !audioRef.current.paused) {
        wasPlayingBeforeSeek.current = true;
        audioRef.current.pause();
      }
      
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      
      // Clear any pending resume
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
      
      // Resume playing after a short delay (when user stops seeking)
      seekTimeoutRef.current = window.setTimeout(() => {
        if (wasPlayingBeforeSeek.current && audioRef.current) {
          audioRef.current.play().catch(console.error);
          wasPlayingBeforeSeek.current = false;
        }
      }, 150);
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
      } else {
        audioRef.current.volume = 0;
      }
    }
    setIsMuted(!isMuted);
  }, [isMuted, volume]);

  const toggleShuffle = useCallback(() => {
    if (!isShuffled) {
      // Enable shuffle
      const currentTrackInQueue = queue[currentIndex];
      const shuffled = shuffleArray(queue.filter((_, i) => i !== currentIndex));
      setQueue([currentTrackInQueue, ...shuffled]);
      setCurrentIndex(0);
    } else {
      // Disable shuffle - restore original order
      const currentTrackId = currentTrack?.id;
      setQueue(originalQueue);
      const newIndex = originalQueue.findIndex(t => t.id === currentTrackId);
      setCurrentIndex(newIndex >= 0 ? newIndex : 0);
    }
    setIsShuffled(!isShuffled);
  }, [isShuffled, queue, currentIndex, currentTrack, originalQueue]);

  const cycleRepeat = useCallback(() => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const currentModeIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentModeIndex + 1) % modes.length]);
  }, [repeatMode]);

  const addToQueue = useCallback((track: MediaTrack) => {
    setQueue(prev => [...prev, track]);
    setOriginalQueue(prev => [...prev, track]);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setOriginalQueue([]);
    setCurrentIndex(-1);
  }, []);

  const closePlayer = useCallback(async () => {
    // Finalize tracking before closing
    await finalizeTracking();
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrentTrack(null);
    setQueue([]);
    setOriginalQueue([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    resetTracking();
  }, [finalizeTracking, resetTracking]);

  return (
    <MediaPlayerContext.Provider
      value={{
        currentTrack,
        queue,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffled,
        repeatMode,
        playTrackingState,
        playTrack,
        pause,
        resume,
        togglePlay,
        next,
        previous,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        addToQueue,
        clearQueue,
        closePlayer,
      }}
    >
      {children}
    </MediaPlayerContext.Provider>
  );
}
