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
}

function RemoteVideoTile({ 
  user, 
  networkQuality,
  isHost,
  onMuteUser,
}: { 
  user: IAgoraRTCRemoteUser; 
  networkQuality: number;
  isHost?: boolean;
  onMuteUser?: (uid: string | number, mute: boolean) => Promise<void>;
}) {
  const videoRef = useRef<HTMLDivElement>(null);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isMuting, setIsMuting] = useState(false);

  useEffect(() => {
    if (user.videoTrack && videoRef.current) {
      user.videoTrack.play(videoRef.current);
    }
    return () => {
      user.videoTrack?.stop();
    };
  }, [user.videoTrack]);

  useEffect(() => {
    if (user.audioTrack && !isRemoteMuted) {
      user.audioTrack.play();
    }
    return () => {
      user.audioTrack?.stop();
    };
  }, [user.audioTrack, isRemoteMuted]);

  const hasVideo = user.hasVideo && user.videoTrack;
  const hasAudio = user.hasAudio && user.audioTrack;

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
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-zinc-800 shadow-lg group">
      {/* Video or Avatar */}
      {hasVideo ? (
        <div ref={videoRef} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-800">
          <div className="w-24 h-24 rounded-full bg-zinc-600 flex items-center justify-center">
            <User className="w-12 h-12 text-zinc-400" />
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
                ? "bg-red-500/80 hover:bg-red-500 text-white"
                : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
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
        <span className="text-sm text-white font-medium truncate">
          User {String(user.uid).slice(0, 8)}
        </span>
        <div className="flex items-center gap-2">
          {(!hasAudio || isRemoteMuted) && <MicOff className="w-4 h-4 text-red-400" />}
          <NetworkQualityBars quality={networkQuality} size="sm" />
        </div>
      </div>

      {/* Speaking indicator */}
      {hasAudio && !isRemoteMuted && (
        <div className="absolute top-3 left-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        </div>
      )}

      {/* Muted by host indicator */}
      {isRemoteMuted && (
        <div className="absolute top-3 left-3 bg-red-500/80 rounded-full px-2 py-1 text-xs text-white flex items-center gap-1">
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
        <div className="text-center text-zinc-400">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
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
        />
      ))}
    </div>
  );
}
