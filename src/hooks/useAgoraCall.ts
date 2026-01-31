import { useState, useCallback, useEffect, useRef } from "react";
import { IAgoraRTCRemoteUser, ICameraVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-react";
import {
  agoraClient,
  createLocalTracks,
  cleanupTracks,
  LocalTracks,
} from "@/lib/agora/agoraClient";
import { getAgoraErrorMessage, isAuthError, isNetworkError, isMediaError } from "@/lib/agora/errorMessages";

export interface AgoraCallState {
  isJoined: boolean;
  isConnecting: boolean;
  localTracks: LocalTracks;
  remoteUsers: IAgoraRTCRemoteUser[];
  error: string | null;
  mediaPermissionDenied: boolean;
  mediaPermissionError: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface UseAgoraCallOptions {
  onUserJoined?: (user: IAgoraRTCRemoteUser) => void;
  onUserLeft?: (user: IAgoraRTCRemoteUser) => void;
  onError?: (error: Error) => void;
}

export function useAgoraCall(options: UseAgoraCallOptions = {}) {
  const [state, setState] = useState<AgoraCallState>({
    isJoined: false,
    isConnecting: false,
    localTracks: { audioTrack: null, videoTrack: null },
    remoteUsers: [],
    error: null,
    mediaPermissionDenied: false,
    mediaPermissionError: null,
    isMuted: false,
    isVideoOff: false,
  });

  const tracksRef = useRef<LocalTracks>({ audioTrack: null, videoTrack: null });

  // Handle remote user events
  useEffect(() => {
    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
      await agoraClient.subscribe(user, mediaType);
      console.log("[Agora] Subscribed to user:", user.uid, "mediaType:", mediaType);

      if (mediaType === "audio") {
        user.audioTrack?.play();
      }

      setState((prev) => ({
        ...prev,
        remoteUsers: [...prev.remoteUsers.filter((u) => u.uid !== user.uid), user],
      }));

      options.onUserJoined?.(user);
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
      console.log("[Agora] User unpublished:", user.uid, "mediaType:", mediaType);
      setState((prev) => ({
        ...prev,
        remoteUsers: prev.remoteUsers.map((u) => (u.uid === user.uid ? user : u)),
      }));
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      console.log("[Agora] User left:", user.uid);
      setState((prev) => ({
        ...prev,
        remoteUsers: prev.remoteUsers.filter((u) => u.uid !== user.uid),
      }));
      options.onUserLeft?.(user);
    };

    const handleConnectionStateChange = (
      curState: string,
      prevState: string,
      reason?: string
    ) => {
      console.log("[Agora] Connection state:", prevState, "->", curState, reason);
      if (curState === "DISCONNECTED") {
        setState((prev) => ({ ...prev, isJoined: false, isConnecting: false }));
      }
    };

    agoraClient.on("user-published", handleUserPublished);
    agoraClient.on("user-unpublished", handleUserUnpublished);
    agoraClient.on("user-left", handleUserLeft);
    agoraClient.on("connection-state-change", handleConnectionStateChange);

    return () => {
      agoraClient.off("user-published", handleUserPublished);
      agoraClient.off("user-unpublished", handleUserUnpublished);
      agoraClient.off("user-left", handleUserLeft);
      agoraClient.off("connection-state-change", handleConnectionStateChange);
    };
  }, [options]);

  // Join a channel
  const joinChannel = useCallback(
    async (channelName: string, token: string | null = null, uid?: string | number, appId?: string) => {
      // Debug logging for troubleshooting
      console.log("[Agora] === JOIN CHANNEL DEBUG ===");
      console.log("[Agora] App ID:", appId ? `${appId.slice(0, 8)}...${appId.slice(-4)}` : "NOT SET");
      console.log("[Agora] Channel:", channelName);
      console.log("[Agora] UID:", uid);
      console.log("[Agora] Token:", token ? `${token.slice(0, 20)}...` : "NOT SET");
      console.log("[Agora] ===========================");

      if (!appId) {
        const error = new Error("Agora App ID is not configured. Please check your Agora console settings.");
        console.error("[Agora] ERROR: Missing App ID");
        setState((prev) => ({ ...prev, error: error.message }));
        options.onError?.(error);
        return;
      }

      setState((prev) => ({
        ...prev,
        isConnecting: true,
        error: null,
        mediaPermissionDenied: false,
        mediaPermissionError: null,
      }));

      try {
        // Attempt to join the channel
        console.log("[Agora] Attempting to join channel...");
        await agoraClient.join(appId, channelName, token, uid);
        console.log("[Agora] ✓ Successfully joined channel:", channelName);

        // After joining, attempt to create/publish local tracks.
        // If the browser denies mic/camera permissions, we still keep the user in the call.
        let tracks: LocalTracks = { audioTrack: null, videoTrack: null };
        let mediaPermissionDenied = false;
        let mediaPermissionError: string | null = null;

        try {
          tracks = await createLocalTracks();
          tracksRef.current = tracks;

          const tracksToPublish = [tracks.audioTrack, tracks.videoTrack].filter(Boolean) as (
            | IMicrophoneAudioTrack
            | ICameraVideoTrack
          )[];

          if (tracksToPublish.length > 0) {
            await agoraClient.publish(tracksToPublish);
            console.log("[Agora] Published local tracks");
          }
        } catch (trackErr) {
          if (isMediaError(trackErr)) {
            mediaPermissionDenied = true;
            mediaPermissionError = getAgoraErrorMessage(trackErr);
            tracksRef.current = { audioTrack: null, videoTrack: null };
            console.warn("[Agora] Joined without mic/camera:", mediaPermissionError);
          } else {
            throw trackErr;
          }
        }

        setState((prev) => ({
          ...prev,
          isJoined: true,
          isConnecting: false,
          localTracks: tracks,
          mediaPermissionDenied,
          mediaPermissionError,
        }));
      } catch (error) {
        const err = error as Error;
        const friendlyMessage = getAgoraErrorMessage(error);
        
        // Enhanced error logging
        console.error("[Agora] === JOIN ERROR ===");
        console.error("[Agora] Raw error:", error);
        console.error("[Agora] Error code:", (error as any)?.code);
        console.error("[Agora] Error message:", err.message);
        console.error("[Agora] User-friendly message:", friendlyMessage);
        
        if (isAuthError(error)) {
          console.error("[Agora] ERROR TYPE: Authentication/App ID issue");
          console.error("[Agora] TROUBLESHOOTING:");
          console.error("  1. Verify App ID is correct in Agora Console");
          console.error("  2. Ensure project is in 'Secured mode: APP ID + Token'");
          console.error("  3. Check that App Certificate is enabled");
          console.error("  4. Verify token was generated with matching App ID and Certificate");
        } else if (isNetworkError(error)) {
          console.error("[Agora] ERROR TYPE: Network/Connection issue");
          console.error("[Agora] TROUBLESHOOTING:");
          console.error("  1. Check internet connectivity");
          console.error("  2. Verify Agora services are operational");
          console.error("  3. Try from a different network");
        }
        console.error("[Agora] ====================");
        
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: friendlyMessage,
        }));
        
        const enhancedError = new Error(friendlyMessage);
        options.onError?.(enhancedError);
        cleanupTracks(tracksRef.current);
      }
    },
    [options]
  );

  // Attempt to enable mic/camera after joining (requires user gesture in many browsers)
  const retryMedia = useCallback(async () => {
    if (!state.isJoined) return false;

    try {
      console.log("[Agora] Retrying media access...");
      const tracks = await createLocalTracks();
      tracksRef.current = tracks;

      const tracksToPublish = [tracks.audioTrack, tracks.videoTrack].filter(Boolean) as (
        | IMicrophoneAudioTrack
        | ICameraVideoTrack
      )[];

      if (tracksToPublish.length > 0) {
        await agoraClient.publish(tracksToPublish);
        console.log("[Agora] ✓ Published local tracks");
      }

      setState((prev) => ({
        ...prev,
        localTracks: tracks,
        mediaPermissionDenied: false,
        mediaPermissionError: null,
      }));

      return true;
    } catch (err) {
      const friendlyMessage = getAgoraErrorMessage(err);
      console.warn("[Agora] Media retry failed:", friendlyMessage);
      
      if (isMediaError(err)) {
        setState((prev) => ({
          ...prev,
          mediaPermissionDenied: true,
          mediaPermissionError: friendlyMessage,
        }));
        return false;
      }

      setState((prev) => ({ ...prev, error: friendlyMessage }));
      options.onError?.(new Error(friendlyMessage));
      return false;
    }
  }, [options, state.isJoined]);

  // Leave the channel
  const leaveChannel = useCallback(async () => {
    try {
      // Unpublish and close tracks
      cleanupTracks(tracksRef.current);
      tracksRef.current = { audioTrack: null, videoTrack: null };

      // Leave channel
      await agoraClient.leave();
      console.log("[Agora] Left channel");

      setState((prev) => ({
        ...prev,
        isJoined: false,
        localTracks: { audioTrack: null, videoTrack: null },
        remoteUsers: [],
        isMuted: false,
        isVideoOff: false,
        mediaPermissionDenied: false,
        mediaPermissionError: null,
      }));
    } catch (error) {
      console.error("[Agora] Error leaving channel:", error);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    const audioTrack = tracksRef.current.audioTrack;
    if (audioTrack) {
      await audioTrack.setEnabled(state.isMuted);
      setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
      console.log("[Agora] Audio muted:", !state.isMuted);
    }
  }, [state.isMuted]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const videoTrack = tracksRef.current.videoTrack;
    if (videoTrack) {
      await videoTrack.setEnabled(state.isVideoOff);
      setState((prev) => ({ ...prev, isVideoOff: !prev.isVideoOff }));
      console.log("[Agora] Video off:", !state.isVideoOff);
    }
  }, [state.isVideoOff]);

  // Mute/unmute remote user (host only)
  const muteRemoteUser = useCallback(async (uid: string | number, mute: boolean) => {
    const remoteUser = state.remoteUsers.find((u) => u.uid === uid);
    if (!remoteUser) {
      throw new Error(`Remote user ${uid} not found`);
    }

    if (!remoteUser.audioTrack) {
      throw new Error(`Remote user ${uid} has no audio track`);
    }

    try {
      // Stop or play the audio track based on mute state
      if (mute) {
        remoteUser.audioTrack.stop();
      } else {
        remoteUser.audioTrack.play();
      }
      console.log(`[Agora] Remote user ${uid} audio ${mute ? "muted" : "unmuted"}`);
    } catch (error) {
      console.error("[Agora] Error muting remote user:", error);
      throw error;
    }
  }, [state.remoteUsers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isJoined) {
        leaveChannel();
      }
    };
  }, []);

  return {
    ...state,
    joinChannel,
    leaveChannel,
    retryMedia,
    toggleMute,
    toggleVideo,
    muteRemoteUser,
  };
}
