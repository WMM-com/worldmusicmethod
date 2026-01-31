import { IAgoraRTCRemoteUser } from "agora-rtc-react";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import { RemoteVideoTile } from "@/components/video/RemoteVideoTile";
import type { RoomParticipantPresence } from "@/hooks/useRoomPresence";

interface RemoteVideoGridProps {
  remoteUsers: IAgoraRTCRemoteUser[];
  networkQuality: number;
  isHost?: boolean;
  onMuteUser?: (uid: string | number, mute: boolean) => Promise<void>;
  speakingByUid?: Record<string, boolean>;
  presenceByAgoraUid?: Record<string, RoomParticipantPresence>;
}

export function RemoteVideoGrid({ 
  remoteUsers, 
  networkQuality,
  isHost,
  onMuteUser,
  speakingByUid,
  presenceByAgoraUid,
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
        "grid gap-4 w-full h-full auto-rows-fr",
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
          displayName={presenceByAgoraUid?.[String(user.uid)]?.display_name}
          roleLabel={presenceByAgoraUid?.[String(user.uid)]?.is_host ? "Host" : undefined}
          presenceMuted={presenceByAgoraUid?.[String(user.uid)]?.is_muted}
          presenceVideoOff={presenceByAgoraUid?.[String(user.uid)]?.is_video_off}
        />
      ))}
    </div>
  );
}

