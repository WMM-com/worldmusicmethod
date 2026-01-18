import { useRef, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PlayTrackingState {
  contentId: string;
  contentType: 'song' | 'podcast_episode';
  contentDurationSeconds: number;
  actualPlayTimeSeconds: number;
  thresholdMet: boolean;
  playRegistered: boolean;
}

interface RegisterPlayResult {
  success: boolean;
  play_id?: string;
  credits_earned?: number;
  threshold_met?: boolean;
  cooldown_passed?: boolean;
  listen_percent?: number;
  error?: string;
}

export function usePlayTracking() {
  const { user } = useAuth();
  const trackingStateRef = useRef<PlayTrackingState | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Mutation to register play event
  const registerPlayMutation = useMutation({
    mutationFn: async (params: {
      contentId: string;
      contentType: 'song' | 'podcast_episode';
      listenDurationSeconds: number;
      contentDurationSeconds: number;
    }): Promise<RegisterPlayResult> => {
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase.rpc('register_play_event', {
        p_content_id: params.contentId,
        p_content_type: params.contentType,
        p_listen_duration_seconds: Math.floor(params.listenDurationSeconds),
        p_content_duration_seconds: Math.floor(params.contentDurationSeconds),
      });

      if (error) {
        console.error('Error registering play:', error);
        return { success: false, error: error.message };
      }

      return data as unknown as RegisterPlayResult;
    },
  });

  // Start tracking a new piece of content
  const startTracking = useCallback((
    contentId: string,
    contentType: 'song' | 'podcast_episode',
    durationSeconds: number
  ) => {
    trackingStateRef.current = {
      contentId,
      contentType,
      contentDurationSeconds: durationSeconds,
      actualPlayTimeSeconds: 0,
      thresholdMet: false,
      playRegistered: false,
    };
    // Set to -1 to indicate we need to initialize on first timeupdate
    lastUpdateTimeRef.current = -1;
    
    console.log('[PlayTracking] Started tracking:', {
      contentId,
      contentType,
      durationSeconds,
    });
  }, []);

  // Update play time - called on each timeupdate event
  // deltaSeconds represents actual audio playback time since last update
  const updatePlayTime = useCallback((currentTimeSeconds: number, isPlaying: boolean) => {
    const state = trackingStateRef.current;
    if (!state || state.playRegistered) return;

    // Only count time when actually playing
    if (!isPlaying) {
      lastUpdateTimeRef.current = currentTimeSeconds;
      return;
    }

    // Initialize on first timeupdate after startTracking
    if (lastUpdateTimeRef.current === -1) {
      lastUpdateTimeRef.current = currentTimeSeconds;
      return;
    }

    // Calculate delta from last update
    const delta = currentTimeSeconds - lastUpdateTimeRef.current;
    
    // Only add positive deltas that are reasonable (< 5 seconds to handle normal timeupdate intervals)
    // timeupdate fires every 250ms typically, but can vary
    if (delta > 0 && delta < 5) {
      state.actualPlayTimeSeconds += delta;
    } else if (delta < 0) {
      // User seeked backwards - just update the reference point, don't add time
      // This prevents counting re-listened sections
    }
    // If delta >= 5, it's likely a seek forward - don't count skipped time
    
    lastUpdateTimeRef.current = currentTimeSeconds;

    // Check if 50% threshold met
    if (state.contentDurationSeconds > 0) {
      const percentPlayed = (state.actualPlayTimeSeconds / state.contentDurationSeconds) * 100;
      
      if (percentPlayed >= 50 && !state.thresholdMet) {
        state.thresholdMet = true;
        console.log('[PlayTracking] 50% threshold met:', {
          contentId: state.contentId,
          actualPlayTime: state.actualPlayTimeSeconds,
          duration: state.contentDurationSeconds,
          percentPlayed,
        });
      }
    }
  }, []);

  // Finalize tracking - called when track ends, user navigates away, or track changes
  const finalizeTracking = useCallback(async () => {
    const state = trackingStateRef.current;
    if (!state || state.playRegistered || !user) return null;

    // Mark as registered to prevent duplicate calls
    state.playRegistered = true;

    console.log('[PlayTracking] Finalizing:', {
      contentId: state.contentId,
      actualPlayTime: state.actualPlayTimeSeconds,
      duration: state.contentDurationSeconds,
      thresholdMet: state.thresholdMet,
    });

    // Register the play event
    const result = await registerPlayMutation.mutateAsync({
      contentId: state.contentId,
      contentType: state.contentType,
      listenDurationSeconds: state.actualPlayTimeSeconds,
      contentDurationSeconds: state.contentDurationSeconds,
    });

    console.log('[PlayTracking] Play registered:', result);
    
    return result;
  }, [user, registerPlayMutation]);

  // Reset tracking state
  const resetTracking = useCallback(() => {
    trackingStateRef.current = null;
    lastUpdateTimeRef.current = 0;
  }, []);

  // Get current tracking state (for debugging/display)
  const getTrackingState = useCallback(() => {
    const state = trackingStateRef.current;
    if (!state) return null;

    return {
      contentId: state.contentId,
      contentType: state.contentType,
      actualPlayTimeSeconds: state.actualPlayTimeSeconds,
      contentDurationSeconds: state.contentDurationSeconds,
      percentPlayed: state.contentDurationSeconds > 0 
        ? (state.actualPlayTimeSeconds / state.contentDurationSeconds) * 100 
        : 0,
      thresholdMet: state.thresholdMet,
      playRegistered: state.playRegistered,
    };
  }, []);

  // Handle page unload/navigation - register play before leaving
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = trackingStateRef.current;
      if (state && !state.playRegistered && user) {
        // Use sendBeacon for reliable delivery during page unload
        const payload = JSON.stringify({
          p_content_id: state.contentId,
          p_content_type: state.contentType,
          p_listen_duration_seconds: Math.floor(state.actualPlayTimeSeconds),
          p_content_duration_seconds: Math.floor(state.contentDurationSeconds),
        });

        // Try to use sendBeacon if available
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          // Note: sendBeacon to RPC functions may not work, but we try
          // The main tracking happens on track change/end
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User is leaving the tab - finalize tracking
        finalizeTracking();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, finalizeTracking]);

  return {
    startTracking,
    updatePlayTime,
    finalizeTracking,
    resetTracking,
    getTrackingState,
    isRegistering: registerPlayMutation.isPending,
  };
}
