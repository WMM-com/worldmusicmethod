import { useState, useCallback, useEffect, useRef } from "react";
import { IAgoraRTCRemoteUser, ICameraVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-react";
import {
  agoraClient,
  AGORA_APP_ID,
  createLocalTracks,
  cleanupTracks,
  LocalTracks,
} from "@/lib/agora/agoraClient";

export interface AgoraCallState {
  isJoined: boolean;
  isConnecting: boolean;
  localTracks: LocalTracks;
  remoteUsers: IAgoraRTCRemoteUser[];
  error: string | null;
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
    async (channelName: string, token: string | null = null, uid?: string | number) => {
      if (!AGORA_APP_ID) {
        const error = new Error("Agora App ID is not configured");
        console.error("[Agora]", error.message);
        setState((prev) => ({ ...prev, error: error.message }));
        options.onError?.(error);
        return;
      }

      setState((prev) => ({ ...prev, isConnecting: true, error: null }));

      try {
        // Create local tracks
        const tracks = await createLocalTracks();
        tracksRef.current = tracks;

        // Join the channel
        await agoraClient.join(AGORA_APP_ID, channelName, token, uid);
        console.log("[Agora] Joined channel:", channelName);

        // Publish local tracks
        const tracksToPublish = [tracks.audioTrack, tracks.videoTrack].filter(
          Boolean
        ) as (IMicrophoneAudioTrack | ICameraVideoTrack)[];

        if (tracksToPublish.length > 0) {
          await agoraClient.publish(tracksToPublish);
          console.log("[Agora] Published local tracks");
        }

        setState((prev) => ({
          ...prev,
          isJoined: true,
          isConnecting: false,
          localTracks: tracks,
        }));
      } catch (error) {
        const err = error as Error;
        console.error("[Agora] Error joining channel:", err);
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: err.message,
        }));
        options.onError?.(err);
        cleanupTracks(tracksRef.current);
      }
    },
    [options]
  );

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
    toggleMute,
    toggleVideo,
  };
}
