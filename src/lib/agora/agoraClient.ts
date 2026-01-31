import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-react";

// Configure Agora SDK
AgoraRTC.setLogLevel(1); // 0: DEBUG, 1: INFO, 2: WARNING, 3: ERROR, 4: NONE

// Create and export the Agora client
export const agoraClient: IAgoraRTCClient = AgoraRTC.createClient({
  mode: "rtc", // "rtc" for video call, "live" for live streaming
  codec: "vp8", // "vp8" or "h264"
});

// Agora credentials from environment variables
export const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || "";

// Track types
export type LocalTracks = {
  audioTrack: IMicrophoneAudioTrack | null;
  videoTrack: ICameraVideoTrack | null;
};

// Create local audio and video tracks
export const createLocalTracks = async (): Promise<LocalTracks> => {
  try {
    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
      {
        // Audio configuration
        encoderConfig: "music_standard",
      },
      {
        // Video configuration
        encoderConfig: {
          width: 640,
          height: 480,
          frameRate: 30,
          bitrateMax: 1000,
        },
      }
    );

    console.log("[Agora] Local tracks created successfully");
    return { audioTrack, videoTrack };
  } catch (error) {
    console.error("[Agora] Error creating local tracks:", error);
    throw error;
  }
};

// Create audio-only track
export const createAudioTrack = async (): Promise<IMicrophoneAudioTrack> => {
  try {
    const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
      encoderConfig: "music_standard",
    });
    console.log("[Agora] Audio track created successfully");
    return audioTrack;
  } catch (error) {
    console.error("[Agora] Error creating audio track:", error);
    throw error;
  }
};

// Create video-only track
export const createVideoTrack = async (): Promise<ICameraVideoTrack> => {
  try {
    const videoTrack = await AgoraRTC.createCameraVideoTrack({
      encoderConfig: {
        width: 640,
        height: 480,
        frameRate: 30,
        bitrateMax: 1000,
      },
    });
    console.log("[Agora] Video track created successfully");
    return videoTrack;
  } catch (error) {
    console.error("[Agora] Error creating video track:", error);
    throw error;
  }
};

// Cleanup tracks
export const cleanupTracks = (tracks: LocalTracks) => {
  if (tracks.audioTrack) {
    tracks.audioTrack.close();
  }
  if (tracks.videoTrack) {
    tracks.videoTrack.close();
  }
  console.log("[Agora] Local tracks cleaned up");
};
