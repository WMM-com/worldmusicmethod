import { useEffect, useRef } from "react";
import { ICameraVideoTrack } from "agora-rtc-react";
import { Mic, MicOff, Video, VideoOff, User } from "lucide-react";
import { NetworkQualityBars } from "./NetworkQualityBars";
import { cn } from "@/lib/utils";

interface LocalVideoTileProps {
  videoTrack: ICameraVideoTrack | null;
  isMuted: boolean;
  isVideoOff: boolean;
  networkQuality: number;
  isSpeaking?: boolean;
  className?: string;
}

export function LocalVideoTile({
  videoTrack,
  isMuted,
  isVideoOff,
  networkQuality,
  isSpeaking = false,
  className,
}: LocalVideoTileProps) {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoTrack && videoRef.current && !isVideoOff) {
      videoTrack.play(videoRef.current);
    }
    return () => {
      videoTrack?.stop();
    };
  }, [videoTrack, isVideoOff]);

  return (
    <div
      className={cn(
        "absolute bottom-24 right-4 w-48 h-36 rounded-xl overflow-hidden shadow-2xl border-2 border-zinc-600 bg-zinc-800 transition-all hover:scale-105",
        className
      )}
    >
      {/* Video or Avatar */}
      {isVideoOff ? (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-800">
          <div className="w-16 h-16 rounded-full bg-zinc-600 flex items-center justify-center">
            <User className="w-8 h-8 text-zinc-400" />
          </div>
        </div>
      ) : (
        <div ref={videoRef} className="w-full h-full object-cover" />
      )}

      {/* Overlay indicators */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-center justify-between">
        <span className="text-xs text-white font-medium">You</span>
        <div className="flex items-center gap-1.5">
          {isMuted ? (
            <MicOff className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <div className="relative">
              <Mic className={cn("w-3.5 h-3.5", isSpeaking ? "text-primary animate-pulse" : "text-white")} />
              {isSpeaking && (
                <span className="absolute -inset-1 rounded-full border border-primary/50 animate-ping" />
              )}
            </div>
          )}
          {isVideoOff ? (
            <VideoOff className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <Video className="w-3.5 h-3.5 text-white" />
          )}
          <NetworkQualityBars quality={networkQuality} size="sm" />
        </div>
      </div>
    </div>
  );
}
