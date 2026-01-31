import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VideoControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMute: () => Promise<void>;
  onToggleVideo: () => Promise<void>;
  onLeave: () => void;
  onToggleParticipants?: () => void;
  participantCount?: number;
  isSpeaking?: boolean;
}

export function VideoControls({
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onLeave,
  onToggleParticipants,
  participantCount = 1,
  isSpeaking = false,
}: VideoControlsProps) {
  return (
    <footer className="bg-muted/80 backdrop-blur-sm border-t border-border px-4 py-4">
      <div className="flex items-center justify-center gap-4 max-w-lg mx-auto">
        {/* Mic Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="lg"
              onClick={onToggleMute}
              className={cn(
                "w-14 h-14 rounded-full transition-all",
                isMuted
                  ? "bg-destructive/20 hover:bg-destructive/30 text-destructive"
                  : cn(
                      "bg-muted-foreground/20 hover:bg-muted-foreground/30 text-foreground",
                      isSpeaking ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-background" : ""
                    )
              )}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isMuted ? "Unmute" : "Mute"}
          </TooltipContent>
        </Tooltip>

        {/* Video Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="lg"
              onClick={onToggleVideo}
              className={cn(
                "w-14 h-14 rounded-full transition-all",
                isVideoOff
                  ? "bg-destructive/20 hover:bg-destructive/30 text-destructive"
                  : "bg-muted-foreground/20 hover:bg-muted-foreground/30 text-foreground"
              )}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6" />
              ) : (
                <Video className="w-6 h-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isVideoOff ? "Turn on camera" : "Turn off camera"}
          </TooltipContent>
        </Tooltip>

        {/* Participants Toggle */}
        {onToggleParticipants && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="lg"
                onClick={onToggleParticipants}
                className="w-14 h-14 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 text-foreground transition-all relative"
              >
                <Users className="w-6 h-6" />
                {participantCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                    {participantCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Participants</TooltipContent>
          </Tooltip>
        )}

        {/* Leave Call */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="lg"
              onClick={onLeave}
              className="w-14 h-14 rounded-full"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Leave call</TooltipContent>
        </Tooltip>
      </div>
    </footer>
  );
}
