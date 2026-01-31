import { useEffect, useRef } from "react";
import { IAgoraRTCRemoteUser } from "agora-rtc-react";
import { User, MicOff } from "lucide-react";
import { NetworkQualityBars } from "./NetworkQualityBars";
import { cn } from "@/lib/utils";

interface RemoteVideoGridProps {
  remoteUsers: IAgoraRTCRemoteUser[];
  networkQuality: number;
}

function RemoteVideoTile({ 
  user, 
  networkQuality 
}: { 
  user: IAgoraRTCRemoteUser; 
  networkQuality: number;
}) {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user.videoTrack && videoRef.current) {
      user.videoTrack.play(videoRef.current);
    }
    return () => {
      user.videoTrack?.stop();
    };
  }, [user.videoTrack]);

  useEffect(() => {
    if (user.audioTrack) {
      user.audioTrack.play();
    }
    return () => {
      user.audioTrack?.stop();
    };
  }, [user.audioTrack]);

  const hasVideo = user.hasVideo && user.videoTrack;
  const hasAudio = user.hasAudio && user.audioTrack;

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-zinc-800 shadow-lg">
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

      {/* User info bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between">
        <span className="text-sm text-white font-medium truncate">
          User {String(user.uid).slice(0, 8)}
        </span>
        <div className="flex items-center gap-2">
          {!hasAudio && <MicOff className="w-4 h-4 text-red-400" />}
          <NetworkQualityBars quality={networkQuality} size="sm" />
        </div>
      </div>

      {/* Speaking indicator */}
      {hasAudio && (
        <div className="absolute top-3 left-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}

export function RemoteVideoGrid({ remoteUsers, networkQuality }: RemoteVideoGridProps) {
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
        />
      ))}
    </div>
  );
}
