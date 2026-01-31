import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is a tutor (admin role)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('[generate-room-name] Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Only tutors can create rooms' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const roomType = body.type === '1on1' ? '1on1' : 'group';
    const invitedUserIds: string[] = body.invited_user_ids || [];

    // Generate unique room name using UUID
    const roomName = crypto.randomUUID();
    
    // Calculate expiry (default 24 hours, can be customized)
    const expiresInHours = body.expires_in_hours || 24;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    // Create the room
    const { data: room, error: roomError } = await supabase
      .from('video_rooms')
      .insert({
        room_name: roomName,
        type: roomType,
        host_user_id: user.id,
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (roomError) {
      console.error('[generate-room-name] Room creation error:', roomError);
      return new Response(
        JSON.stringify({ error: 'Failed to create room', details: roomError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-room-name] Room created:', room.id);

    // Add invited participants if any
    if (invitedUserIds.length > 0) {
      const participants = invitedUserIds.map(userId => ({
        room_id: room.id,
        user_id: userId,
      }));

      const { error: participantError } = await supabase
        .from('room_participants')
        .insert(participants);

      if (participantError) {
        console.error('[generate-room-name] Participant invite error:', participantError);
        // Room was created, just log the error
      } else {
        console.log('[generate-room-name] Invited', invitedUserIds.length, 'participants');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        room: {
          id: room.id,
          room_name: room.room_name,
          type: room.type,
          expires_at: room.expires_at,
          is_active: room.is_active,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-room-name] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
