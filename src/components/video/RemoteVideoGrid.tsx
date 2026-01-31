import { useEffect, useRef, useState } from "react";
import { IAgoraRTCRemoteUser } from "agora-rtc-react";
import { User, MicOff, Mic, Volume2, VolumeX } from "lucide-react";
import { NetworkQualityBars } from "./NetworkQualityBars";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RemoteVideoGridProps {
  remoteUsers: IAgoraRTCRemoteUser[];
  networkQuality: number;
  isHost?: boolean;
  onMuteUser?: (uid: string | number, mute: boolean) => Promise<void>;
  speakingByUid?: Record<string, boolean>;
}

function RemoteVideoTile({ 
  user, 
  networkQuality,
  isHost,
  onMuteUser,
  speakingByUid,
}: { 
  user: IAgoraRTCRemoteUser; 
  networkQuality: number;
  isHost?: boolean;
  onMuteUser?: (uid: string | number, mute: boolean) => Promise<void>;
  speakingByUid?: Record<string, boolean>;
}) {
  const videoRef = useRef<HTMLDivElement>(null);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isMuting, setIsMuting] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Play video track when available and container is ready
  useEffect(() => {
    const container = videoRef.current;
    const videoTrack = user.videoTrack;
    
    if (!container) {
      console.log("[RemoteVideoTile] No container ref for user:", user.uid);
      return;
    }
    
    if (!videoTrack) {
      console.log("[RemoteVideoTile] No video track for user:", user.uid);
      setVideoPlaying(false);
      return;
    }

    console.log("[RemoteVideoTile] Playing video for user:", user.uid);
    
    // Play the video track in the container
    try {
      videoTrack.play(container);
      setVideoPlaying(true);
      console.log("[RemoteVideoTile] ✓ Video playing for user:", user.uid);
    } catch (err) {
      console.error("[RemoteVideoTile] Failed to play video for user:", user.uid, err);
      setVideoPlaying(false);
    }

    return () => {
      console.log("[RemoteVideoTile] Stopping video for user:", user.uid);
      try {
        videoTrack.stop();
      } catch (err) {
        // Track may already be stopped
      }
      setVideoPlaying(false);
    };
  }, [user.uid, user.videoTrack]);

  // Play audio track when available
  useEffect(() => {
    const audioTrack = user.audioTrack;
    
    if (!audioTrack) {
      return;
    }

    if (!isRemoteMuted) {
      console.log("[RemoteVideoTile] Playing audio for user:", user.uid);
      try {
        audioTrack.play();
      } catch (err) {
        console.error("[RemoteVideoTile] Failed to play audio:", err);
      }
    }

    return () => {
      try {
        audioTrack.stop();
      } catch (err) {
        // Track may already be stopped
      }
    };
  }, [user.uid, user.audioTrack, isRemoteMuted]);

  const hasAudio = user.hasAudio && user.audioTrack;
  const isSpeaking = !!speakingByUid?.[String(user.uid)];
  // Show video container when we have a video track OR are expecting one
  const showVideo = videoPlaying || (user.hasVideo && user.videoTrack);

  const handleMuteToggle = async () => {
    if (!onMuteUser) return;
    
    setIsMuting(true);
    try {
      await onMuteUser(user.uid, !isRemoteMuted);
      setIsRemoteMuted(!isRemoteMuted);
      toast.success(isRemoteMuted ? "User unmuted" : "User muted");
    } catch (error) {
      console.error("[RemoteVideoTile] Mute error:", error);
      toast.error("Failed to change mute state");
    } finally {
      setIsMuting(false);
    }
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-muted shadow-lg group min-h-[200px]">
      {/* Video container - always present so track can play into it */}
      <div 
        ref={videoRef} 
        className={cn(
          "w-full h-full",
          showVideo ? "block" : "hidden"
        )}
      />
      
      {/* Avatar fallback when no video */}
      {!showVideo && (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/80">
          <div className="w-24 h-24 rounded-full bg-muted-foreground/20 flex items-center justify-center">
            <User className="w-12 h-12 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* Host Controls - Only visible to host */}
      {isHost && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMuteToggle}
            disabled={isMuting || !hasAudio}
            className={cn(
              "w-10 h-10 rounded-full p-0",
              isRemoteMuted
                ? "bg-destructive/80 hover:bg-destructive text-destructive-foreground"
                : "bg-muted/80 hover:bg-muted text-foreground"
            )}
            title={isRemoteMuted ? "Unmute user" : "Mute user"}
          >
            {isRemoteMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
        </div>
      )}

      {/* User info bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between">
        <span className="text-sm text-foreground font-medium truncate">
          User {String(user.uid).slice(0, 8)}
        </span>
        <div className="flex items-center gap-2">
          {(!hasAudio || isRemoteMuted) && <MicOff className="w-4 h-4 text-destructive" />}
          <NetworkQualityBars quality={networkQuality} size="sm" />
        </div>
      </div>

      {/* Speaking indicator */}
      {hasAudio && !isRemoteMuted && isSpeaking && (
        <div className="absolute top-3 left-3">
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
        </div>
      )}

      {/* Muted by host indicator */}
      {isRemoteMuted && (
        <div className="absolute top-3 left-3 bg-destructive/80 rounded-full px-2 py-1 text-xs text-destructive-foreground flex items-center gap-1">
          <VolumeX className="w-3 h-3" />
          Muted
        </div>
      )}
    </div>
  );
}

export function RemoteVideoGrid({ 
  remoteUsers, 
  networkQuality,
  isHost,
  onMuteUser,
  speakingByUid,
}: RemoteVideoGridProps) {
  const userCount = remoteUsers.length;

  // Calculate grid columns based on user count
  const getGridClass = () => {
    if (userCount === 0) return "grid-cols-1";
    if (userCount === 1) return "grid-cols-1";
    if (userCount === 2) return "grid-cols-2";
    if (userCount <= 4) return "grid-cols-2";
    if (userCount <= 6) return "grid-cols-3";
    return "grid-cols-4";
  };

  if (userCount === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <User className="w-12 h-12" />
          </div>
          <p className="text-lg font-medium">Waiting for others to join...</p>
          <p className="text-sm mt-1">Share this room link to invite participants</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4 h-full auto-rows-fr",
        getGridClass()
      )}
    >
      {remoteUsers.map((user) => (
        <RemoteVideoTile
          key={user.uid}
          user={user}
          networkQuality={networkQuality}
          isHost={isHost}
          onMuteUser={onMuteUser}
          speakingByUid={speakingByUid}
        />
      ))}
    </div>
  );
}
