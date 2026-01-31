import { useEffect, useMemo, useRef, useState } from "react";
import { IAgoraRTCRemoteUser } from "agora-rtc-react";
import { MicOff, User, VideoOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NetworkQualityBars } from "./NetworkQualityBars";

export function RemoteVideoTile({
  user,
  networkQuality,
  isHost,
  onMuteUser,
  speakingByUid,
  displayName,
  roleLabel,
  presenceMuted,
  presenceVideoOff,
}: {
  user: IAgoraRTCRemoteUser;
  networkQuality: number;
  isHost?: boolean;
  onMuteUser?: (uid: string | number, mute: boolean) => Promise<void>;
  speakingByUid?: Record<string, boolean>;
  displayName?: string;
  roleLabel?: string;
  presenceMuted?: boolean;
  presenceVideoOff?: boolean;
}) {
  const videoRef = useRef<HTMLDivElement>(null);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isMuting, setIsMuting] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const isSpeaking = !!speakingByUid?.[String(user.uid)];
  const hasAudioTrack = !!user.audioTrack;
  const hasVideoTrack = !!user.videoTrack;
  const hasAudio = Boolean(user.hasAudio && hasAudioTrack);

  const effectiveMuted = isRemoteMuted || !!presenceMuted;
  const effectiveVideoOff = !!presenceVideoOff || !hasVideoTrack;

  // Robust remote video playback: wait until container has a real size, clear stale children, retry.
  useEffect(() => {
    const container = videoRef.current;
    const videoTrack = user.videoTrack;
    if (!container || !videoTrack) {
      setVideoPlaying(false);
      return;
    }

    let cancelled = false;
    let tries = 0;

    const tryPlay = () => {
      if (cancelled) return;

      const rect = container.getBoundingClientRect();
      const hasSize = rect.width > 2 && rect.height > 2;
      if (!hasSize) {
        tries += 1;
        if (tries < 30) {
          requestAnimationFrame(tryPlay);
        } else {
          console.warn("[RemoteVideoTile] Container has no size for user:", user.uid, rect);
        }
        return;
      }

      try {
        // Clear any stale DOM the SDK may have injected previously.
        container.innerHTML = "";
        videoTrack.play(container);
        setVideoPlaying(true);
      } catch (err) {
        console.error("[RemoteVideoTile] Failed to play video for user:", user.uid, err);
        setVideoPlaying(false);
        tries += 1;
        if (tries < 5) setTimeout(tryPlay, 200);
      }
    };

    tryPlay();

    return () => {
      cancelled = true;
      try {
        videoTrack.stop();
      } catch {
        // ignore
      }
      setVideoPlaying(false);
    };
  }, [user.uid, user.videoTrack]);

  // Keep audio playing unless host-mute is applied.
  useEffect(() => {
    const audioTrack = user.audioTrack;
    if (!audioTrack) return;

    if (!effectiveMuted) {
      try {
        audioTrack.play();
      } catch (err) {
        console.error("[RemoteVideoTile] Failed to play audio:", err);
      }
    } else {
      try {
        audioTrack.stop();
      } catch {
        // ignore
      }
    }

    return () => {
      try {
        audioTrack.stop();
      } catch {
        // ignore
      }
    };
  }, [user.uid, user.audioTrack, effectiveMuted]);

  const showVideo = videoPlaying && !effectiveVideoOff;

  const title = useMemo(() => {
    const base = displayName?.trim() || `User ${String(user.uid).slice(0, 8)}`;
    return base;
  }, [displayName, user.uid]);

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
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-muted shadow-lg group">
      {/* Video container - always present so track can play into it */}
      <div
        ref={videoRef}
        className={cn(
          "absolute inset-0 w-full h-full transition-opacity",
          "[&_video]:w-full [&_video]:h-full [&_video]:object-cover",
          showVideo ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Avatar fallback when video isn't actually playing */}
      {!showVideo && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/80">
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
            {isRemoteMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
        </div>
      )}

      {/* User info bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-foreground font-medium truncate">{title}</span>
            {roleLabel && <Badge variant="secondary" className="shrink-0">{roleLabel}</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(effectiveMuted || !hasAudio) && <MicOff className="w-4 h-4 text-destructive" />}
          {effectiveVideoOff && <VideoOff className="w-4 h-4 text-muted-foreground" />}
          <NetworkQualityBars quality={networkQuality} size="sm" />
        </div>
      </div>

      {/* Speaking indicator */}
      {hasAudio && !effectiveMuted && isSpeaking && (
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
