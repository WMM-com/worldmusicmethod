import { IAgoraRTCRemoteUser } from "agora-rtc-react";

export interface VideoCallProps {
  channelName: string;
  token?: string | null;
  uid?: string | number;
  onLeave?: () => void;
}

export interface RemoteVideoPlayerProps {
  user: IAgoraRTCRemoteUser;
  className?: string;
}

export interface LocalVideoPlayerProps {
  className?: string;
}

export interface AgoraConfig {
  appId: string;
  channel: string;
  token: string | null;
  uid?: string | number;
}

export interface CallControls {
  isMuted: boolean;
  isVideoOff: boolean;
  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  leaveChannel: () => Promise<void>;
}
