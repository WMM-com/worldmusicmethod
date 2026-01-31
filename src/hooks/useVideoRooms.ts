import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface VideoRoom {
  id: string;
  room_name: string;
  is_active: boolean;
  type: "group" | "1on1";
  host_user_id: string;
  created_at: string;
  expires_at: string;
}

interface CreateRoomOptions {
  type?: "group" | "1on1";
  invited_user_ids?: string[];
  expires_in_hours?: number;
}

export function useVideoRooms() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a new room via edge function
  const createRoom = useCallback(async (options: CreateRoomOptions = {}) => {
    if (!user) {
      setError("You must be logged in to create a room");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-room-name", {
        body: {
          type: options.type || "group",
          invited_user_ids: options.invited_user_ids || [],
          expires_in_hours: options.expires_in_hours || 24,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to create room");
      }

      console.log("[useVideoRooms] Room created:", data.room);
      return data.room as VideoRoom;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create room";
      setError(message);
      console.error("[useVideoRooms] Create room error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch rooms the user hosts or is invited to
  const fetchRooms = useCallback(async () => {
    if (!user) return [];

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("video_rooms")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      return data as VideoRoom[];
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch rooms";
      setError(message);
      console.error("[useVideoRooms] Fetch rooms error:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get a specific room by ID
  const getRoom = useCallback(async (roomId: string) => {
    if (!user) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from("video_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (fetchError) throw fetchError;
      return data as VideoRoom;
    } catch (err) {
      console.error("[useVideoRooms] Get room error:", err);
      return null;
    }
  }, [user]);

  // Deactivate a room
  const deactivateRoom = useCallback(async (roomId: string) => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from("video_rooms")
        .update({ is_active: false })
        .eq("id", roomId)
        .eq("host_user_id", user.id);

      if (updateError) throw updateError;
      console.log("[useVideoRooms] Room deactivated:", roomId);
      return true;
    } catch (err) {
      console.error("[useVideoRooms] Deactivate room error:", err);
      return false;
    }
  }, [user]);

  // Invite a user to a room
  const inviteUser = useCallback(async (roomId: string, userId: string) => {
    if (!user) return false;

    try {
      const { error: insertError } = await supabase
        .from("room_participants")
        .insert({ room_id: roomId, user_id: userId });

      if (insertError) throw insertError;
      console.log("[useVideoRooms] User invited:", userId);
      return true;
    } catch (err) {
      console.error("[useVideoRooms] Invite user error:", err);
      return false;
    }
  }, [user]);

  // Mark user as joined
  const joinRoom = useCallback(async (roomId: string) => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from("room_participants")
        .update({ joined_at: new Date().toISOString() })
        .eq("room_id", roomId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;
      console.log("[useVideoRooms] Joined room:", roomId);
      return true;
    } catch (err) {
      console.error("[useVideoRooms] Join room error:", err);
      return false;
    }
  }, [user]);

  return {
    loading,
    error,
    createRoom,
    fetchRooms,
    getRoom,
    deactivateRoom,
    inviteUser,
    joinRoom,
  };
}
