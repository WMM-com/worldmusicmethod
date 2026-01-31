import { X, Users, Mic, MicOff, Video, VideoOff, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { IAgoraRTCRemoteUser } from "agora-rtc-react";

export interface Participant {
  uid: string | number;
  displayName?: string;
  isHost?: boolean;
  hasAudio?: boolean;
  hasVideo?: boolean;
  isSpeaking?: boolean;
}

interface ParticipantsSidebarProps {
  open: boolean;
  onClose: () => void;
  remoteUsers: IAgoraRTCRemoteUser[];
  localUser: {
    uid: string | number | null;
    displayName?: string;
    isHost: boolean;
    isMuted: boolean;
    isVideoOff: boolean;
    isSpeaking?: boolean;
  };
  speakingByUid?: Record<string, boolean>;
}

function ParticipantItem({ 
  participant, 
  isLocal = false,
}: { 
  participant: Participant;
  isLocal?: boolean;
}) {
  const initials = participant.displayName 
    ? participant.displayName.slice(0, 2).toUpperCase()
    : `U${String(participant.uid).slice(0, 1)}`;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarFallback className={cn(
            "text-sm font-medium",
            participant.isHost ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            {initials}
          </AvatarFallback>
        </Avatar>
        {participant.isSpeaking && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background animate-pulse" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {participant.displayName || `User ${String(participant.uid).slice(0, 8)}`}
          </span>
          {isLocal && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              You
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {participant.isHost && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 gap-1 border-primary/50 text-primary">
              <Crown className="w-3 h-3" />
              Host
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {participant.hasAudio ? (
          <Mic className="w-4 h-4 text-muted-foreground" />
        ) : (
          <MicOff className="w-4 h-4 text-destructive" />
        )}
        {participant.hasVideo ? (
          <Video className="w-4 h-4 text-muted-foreground" />
        ) : (
          <VideoOff className="w-4 h-4 text-destructive" />
        )}
      </div>
    </div>
  );
}

export function ParticipantsSidebar({
  open,
  onClose,
  remoteUsers,
  localUser,
  speakingByUid = {},
}: ParticipantsSidebarProps) {
  const totalParticipants = remoteUsers.length + 1; // +1 for local user

  // Build local participant
  const localParticipant: Participant = {
    uid: localUser.uid ?? "local",
    displayName: localUser.displayName || "You",
    isHost: localUser.isHost,
    hasAudio: !localUser.isMuted,
    hasVideo: !localUser.isVideoOff,
    isSpeaking: localUser.isSpeaking,
  };

  // Build remote participants
  const remoteParticipants: Participant[] = remoteUsers.map((user) => ({
    uid: user.uid,
    displayName: undefined, // Could be enhanced with presence data
    isHost: false,
    hasAudio: user.hasAudio,
    hasVideo: user.hasVideo,
    isSpeaking: speakingByUid[String(user.uid)] ?? false,
  }));

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-[320px] sm:w-[380px] p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <SheetTitle className="text-base">
                Participants ({totalParticipants})
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-60px)]">
          <div className="p-2 space-y-1">
            {/* Local user first */}
            <ParticipantItem 
              participant={localParticipant} 
              isLocal 
            />

            {/* Divider if there are remote users */}
            {remoteParticipants.length > 0 && (
              <div className="px-3 py-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  In this call
                </span>
              </div>
            )}

            {/* Remote users */}
            {remoteParticipants.map((participant) => (
              <ParticipantItem 
                key={participant.uid} 
                participant={participant}
              />
            ))}

            {/* Empty state for when alone */}
            {remoteParticipants.length === 0 && (
              <div className="px-3 py-6 text-center text-muted-foreground">
                <p className="text-sm">No other participants yet</p>
                <p className="text-xs mt-1">Share the room link to invite others</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
