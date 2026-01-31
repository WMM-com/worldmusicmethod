import { Mic, MicOff, User, Video, VideoOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { RoomParticipantPresence } from "@/hooks/useRoomPresence";

export function ParticipantsSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: RoomParticipantPresence[];
  participantCount: number;
  onLeave: () => void;
}) {
  const { open, onOpenChange, participants, participantCount, onLeave } = props;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Participants
            <span className="text-muted-foreground font-normal">({participantCount})</span>
          </SheetTitle>
          <SheetDescription>
            Who’s currently in the room.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-3">
          {participants.map((p) => {
            const name = p.display_name || `User ${String(p.agora_uid).slice(0, 8)}`;
            return (
              <div
                key={p.user_id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-foreground truncate">{name}</span>
                      {p.is_host && <Badge variant="secondary">Host</Badge>}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {p.profile_type && <Badge variant="outline">{p.profile_type}</Badge>}
                      {(p.tags ?? []).slice(0, 3).map((t) => (
                        <Badge key={t} variant="outline">{t}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full border border-border flex items-center justify-center",
                      p.is_muted ? "bg-muted" : "bg-background"
                    )}
                    title={p.is_muted ? "Muted" : "Mic on"}
                  >
                    {p.is_muted ? (
                      <MicOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Mic className="h-4 w-4 text-foreground" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full border border-border flex items-center justify-center",
                      p.is_video_off ? "bg-muted" : "bg-background"
                    )}
                    title={p.is_video_off ? "Camera off" : "Camera on"}
                  >
                    {p.is_video_off ? (
                      <VideoOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Video className="h-4 w-4 text-foreground" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <Button variant="destructive" className="w-full" onClick={onLeave}>
            Leave call
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
