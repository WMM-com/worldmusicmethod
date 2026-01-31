import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[join-video-room] Auth error:", authError);
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const roomName: string | undefined = body.room_name || body.roomName || body.roomId;

    if (!roomName || typeof roomName !== "string") {
      return new Response(JSON.stringify({ success: false, error: "room_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[join-video-room] Fetching room:", roomName, "for user:", user.id);

    const { data: room, error: roomError } = await supabase
      .from("video_rooms")
      .select("*")
      .eq("room_name", roomName)
      .maybeSingle();

    if (roomError) {
      console.error("[join-video-room] Room fetch error:", roomError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to load room details" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!room) {
      return new Response(JSON.stringify({ success: false, error: "Room not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!room.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: "This room is no longer active" }),
        {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const expiresAt = new Date(room.expires_at);
    if (Number.isFinite(expiresAt.getTime()) && expiresAt < new Date()) {
      // Best-effort: mark inactive so future joins get a clear message.
      const { error: deactivateError } = await supabase
        .from("video_rooms")
        .update({ is_active: false })
        .eq("id", room.id);

      if (deactivateError) {
        console.error("[join-video-room] Failed to deactivate expired room:", deactivateError);
      }

      return new Response(JSON.stringify({ success: false, error: "This room has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record join (also ensures non-hosts can join without needing direct SELECT access)
    const joinedAt = new Date().toISOString();
    const { error: participantUpsertError } = await supabase
      .from("room_participants")
      .upsert(
        { room_id: room.id, user_id: user.id, joined_at: joinedAt },
        { onConflict: "room_id,user_id" }
      );

    if (participantUpsertError) {
      console.error("[join-video-room] Failed to upsert participant:", participantUpsertError);
      // Don't block joining; room details are still valid.
    }

    return new Response(
      JSON.stringify({
        success: true,
        room: {
          id: room.id,
          room_name: room.room_name,
          type: room.type,
          host_user_id: room.host_user_id,
          expires_at: room.expires_at,
          is_active: room.is_active,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[join-video-room] Error:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
