import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
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
}

export function VideoControls({
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onLeave,
}: VideoControlsProps) {
  return (
    <footer className="bg-zinc-800/80 backdrop-blur-sm border-t border-zinc-700 px-4 py-4">
      <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
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
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                  : "bg-zinc-700 hover:bg-zinc-600 text-white"
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
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                  : "bg-zinc-700 hover:bg-zinc-600 text-white"
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

        {/* Leave Call */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="lg"
              onClick={onLeave}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700"
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
