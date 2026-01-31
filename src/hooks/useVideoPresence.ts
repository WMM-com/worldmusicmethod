import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PresenceUser {
  odeum_uid: string; // Supabase user ID
  agora_uid: string | number; // Agora UID
  displayName: string;
  isHost: boolean;
  joinedAt: string;
}

interface UseVideoPresenceOptions {
  roomName: string | null;
  enabled: boolean;
  localUser: {
    supabaseUserId: string;
    agoraUid: string | number | null;
    displayName: string;
    isHost: boolean;
  };
}

export function useVideoPresence({ roomName, enabled, localUser }: UseVideoPresenceOptions) {
  const [participants, setParticipants] = useState<Record<string, PresenceUser>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Get display name by Agora UID
  const getDisplayName = useCallback(
    (agoraUid: string | number): string | undefined => {
      const agoraUidStr = String(agoraUid);
      for (const p of Object.values(participants)) {
        if (String(p.agora_uid) === agoraUidStr) {
          return p.displayName;
        }
      }
      return undefined;
    },
    [participants]
  );

  // Check if a user is host by Agora UID
  const isUserHost = useCallback(
    (agoraUid: string | number): boolean => {
      const agoraUidStr = String(agoraUid);
      for (const p of Object.values(participants)) {
        if (String(p.agora_uid) === agoraUidStr) {
          return p.isHost;
        }
      }
      return false;
    },
    [participants]
  );

  useEffect(() => {
    if (!enabled || !roomName || !localUser.agoraUid) {
      return;
    }

    const channelName = `video-room:${roomName}`;
    console.log("[useVideoPresence] Subscribing to channel:", channelName);

    const channel = supabase.channel(channelName, {
      config: { presence: { key: localUser.supabaseUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        console.log("[useVideoPresence] Presence sync:", state);
        
        const newParticipants: Record<string, PresenceUser> = {};
        for (const [key, presences] of Object.entries(state)) {
          if (presences.length > 0) {
            newParticipants[key] = presences[0] as PresenceUser;
          }
        }
        setParticipants(newParticipants);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("[useVideoPresence] User joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("[useVideoPresence] User left:", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          console.log("[useVideoPresence] Channel subscribed, tracking presence...");
          await channel.track({
            odeum_uid: localUser.supabaseUserId,
            agora_uid: localUser.agoraUid,
            displayName: localUser.displayName,
            isHost: localUser.isHost,
            joinedAt: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      console.log("[useVideoPresence] Unsubscribing from channel");
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [enabled, roomName, localUser.supabaseUserId, localUser.agoraUid, localUser.displayName, localUser.isHost]);

  return {
    participants,
    getDisplayName,
    isUserHost,
    participantCount: Object.keys(participants).length,
  };
}
