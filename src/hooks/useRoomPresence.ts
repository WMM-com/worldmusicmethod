import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RoomParticipantPresence = {
  user_id: string;
  agora_uid: number;
  display_name: string;
  profile_type?: string | null;
  tags?: string[] | null;
  is_host: boolean;
  is_muted: boolean;
  is_video_off: boolean;
  joined_at: string;
};

type PresenceState = Record<string, RoomParticipantPresence[]>;

function pickLatest(presences: RoomParticipantPresence[]): RoomParticipantPresence | null {
  if (!presences?.length) return null;
  // Prefer newest joined_at if present, otherwise last element.
  return [...presences].sort((a, b) => (a.joined_at < b.joined_at ? 1 : -1))[0] ?? null;
}

export function useRoomPresence(params: {
  enabled: boolean;
  roomName: string | null;
  self:
    | {
        userId: string;
        agoraUid: number;
        displayName: string;
        profileType?: string | null;
        tags?: string[] | null;
        isHost: boolean;
        isMuted: boolean;
        isVideoOff: boolean;
      }
    | null;
}) {
  const { enabled, roomName, self } = params;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [participants, setParticipants] = useState<RoomParticipantPresence[]>([]);
  const [status, setStatus] = useState<"idle" | "joining" | "subscribed" | "error">("idle");

  const recomputeFromState = useCallback((state: PresenceState) => {
    const list: RoomParticipantPresence[] = [];
    for (const key of Object.keys(state)) {
      const latest = pickLatest(state[key]);
      if (latest) list.push(latest);
    }

    // stable ordering: host first, then name
    list.sort((a, b) => {
      if (a.is_host !== b.is_host) return a.is_host ? -1 : 1;
      return a.display_name.localeCompare(b.display_name);
    });
    setParticipants(list);
  }, []);

  // Join presence channel
  useEffect(() => {
    if (!enabled || !roomName) return;

    setStatus("joining");
    const channel = supabase.channel(`video-room:${roomName}`, {
      config: {
        presence: { key: self?.userId ?? crypto.randomUUID() },
      },
    });

    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<RoomParticipantPresence>() as PresenceState;
        recomputeFromState(state);
      })
      .on("presence", { event: "join" }, () => {
        const state = channel.presenceState<RoomParticipantPresence>() as PresenceState;
        recomputeFromState(state);
      })
      .on("presence", { event: "leave" }, () => {
        const state = channel.presenceState<RoomParticipantPresence>() as PresenceState;
        recomputeFromState(state);
      });

    channel.subscribe(async (s) => {
      if (s === "SUBSCRIBED") {
        setStatus("subscribed");
        if (self) {
          await channel.track({
            user_id: self.userId,
            agora_uid: self.agoraUid,
            display_name: self.displayName,
            profile_type: self.profileType,
            tags: self.tags,
            is_host: self.isHost,
            is_muted: self.isMuted,
            is_video_off: self.isVideoOff,
            joined_at: new Date().toISOString(),
          } satisfies RoomParticipantPresence);
        }
      }

      if (s === "CHANNEL_ERROR") {
        setStatus("error");
      }
    });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
      setParticipants([]);
      setStatus("idle");
    };
  }, [enabled, roomName, recomputeFromState, self?.agoraUid, self?.displayName, self?.isHost, self?.isMuted, self?.isVideoOff, self?.profileType, self?.tags, self?.userId]);

  const updateSelf = useCallback(async (
    patch: Partial<Pick<RoomParticipantPresence, "is_muted" | "is_video_off" | "display_name" | "tags" | "profile_type">>
  ) => {
    const channel = channelRef.current;
    if (!channel || !self) return;

    await channel.track({
      user_id: self.userId,
      agora_uid: self.agoraUid,
      display_name: patch.display_name ?? self.displayName,
      profile_type: patch.profile_type ?? self.profileType,
      tags: patch.tags ?? self.tags,
      is_host: self.isHost,
      is_muted: patch.is_muted ?? self.isMuted,
      is_video_off: patch.is_video_off ?? self.isVideoOff,
      joined_at: new Date().toISOString(),
    } satisfies RoomParticipantPresence);
  }, [self]);

  const byAgoraUid = useMemo(() => {
    const map: Record<string, RoomParticipantPresence> = {};
    for (const p of participants) map[String(p.agora_uid)] = p;
    return map;
  }, [participants]);

  return {
    status,
    participants,
    participantCount: participants.length,
    byAgoraUid,
    updateSelf,
  };
}
