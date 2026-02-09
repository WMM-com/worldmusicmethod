import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { bookingRequestId } = await req.json();
    if (!bookingRequestId) {
      return new Response(JSON.stringify({ error: 'Missing bookingRequestId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch booking with lesson
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .select('*, lesson:lessons(id, tutor_id, title)')
      .eq('id', bookingRequestId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only tutor or system can create the room
    const tutorId = booking.lesson.tutor_id;
    const studentId = booking.student_id;

    // Check if room already exists
    if (booking.video_room_id) {
      const { data: existingRoom } = await supabase
        .from('video_rooms')
        .select('*')
        .eq('id', booking.video_room_id)
        .single();
      if (existingRoom) {
        return new Response(JSON.stringify({ success: true, room: existingRoom }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get the confirmed slot time for expiry
    const { data: confirmedSlot } = await supabase
      .from('booking_slots')
      .select('start_time, end_time')
      .eq('request_id', bookingRequestId)
      .eq('status', 'selected_by_tutor')
      .order('start_time', { ascending: true })
      .limit(1)
      .single();

    // Room expires 2 hours after the confirmed slot end, or 48 hours from now
    const expiresAt = confirmedSlot
      ? new Date(new Date(confirmedSlot.end_time).getTime() + 2 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // Create a room with a deterministic name
    const roomName = `lesson_${bookingRequestId}`;

    const { data: room, error: roomError } = await supabase
      .from('video_rooms')
      .insert({
        room_name: roomName,
        type: '1on1',
        host_user_id: tutorId,
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (roomError) {
      console.error('[create-booking-room] Room creation error:', roomError);
      return new Response(JSON.stringify({ error: 'Failed to create room' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add student as participant
    await supabase.from('room_participants').insert({
      room_id: room.id,
      user_id: studentId,
    });

    // Link room to booking
    await supabase
      .from('booking_requests')
      .update({ video_room_id: room.id })
      .eq('id', bookingRequestId);

    console.log(`[create-booking-room] Room ${room.id} created for booking ${bookingRequestId}`);

    return new Response(JSON.stringify({ success: true, room }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[create-booking-room] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
