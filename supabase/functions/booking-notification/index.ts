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

    const { bookingRequestId, type } = await req.json();
    // type: 'new_request' | 'tutor_reviewed' | 'payment_pending' | 'confirmed' | 'cancelled'

    if (!bookingRequestId || !type) {
      return new Response(JSON.stringify({ error: 'Missing bookingRequestId or type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the booking request with lesson + student info
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .select('*, lesson:lessons(id, title, tutor_id, price, currency, duration_minutes)')
      .eq('id', bookingRequestId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lesson = booking.lesson;
    const studentId = booking.student_id;
    const tutorId = lesson.tutor_id;

    // Determine message content and recipient
    let messageContent: string;
    let recipientId: string;

    switch (type) {
      case 'new_request':
        recipientId = tutorId;
        messageContent = `📩 New Lesson Request: "${lesson.title}". Check your dashboard to review proposed times.`;
        break;
      case 'tutor_reviewed':
        recipientId = studentId;
        messageContent = `✅ Your tutor has reviewed your request for "${lesson.title}" and selected a time. Please check your bookings.`;
        break;
      case 'payment_pending':
        recipientId = studentId;
        messageContent = `💳 Your lesson "${lesson.title}" is confirmed by the tutor! Please complete payment to finalize your booking.`;
        break;
      case 'confirmed':
        recipientId = tutorId;
        messageContent = `🎉 Payment received for "${lesson.title}"! The lesson is confirmed. A video room has been created for your session.`;
        break;
      case 'cancelled':
        recipientId = user.id === studentId ? tutorId : studentId;
        messageContent = `❌ The booking request for "${lesson.title}" has been cancelled.`;
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Find or create conversation between student and tutor
    const participants = [studentId, tutorId].sort();
    const { data: existingConvs } = await supabase
      .from('conversations')
      .select('id, participant_ids')
      .contains('participant_ids', participants);

    let conversationId: string;
    const matchingConv = existingConvs?.find(
      c => c.participant_ids.length === 2 &&
           c.participant_ids.includes(studentId) &&
           c.participant_ids.includes(tutorId)
    );

    if (matchingConv) {
      conversationId = matchingConv.id;
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({ participant_ids: participants })
        .select('id')
        .single();
      if (convError) throw convError;
      conversationId = newConv.id;
    }

    // Send the system message
    const { error: msgError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: messageContent,
      message_type: 'system',
      metadata: {
        booking_request_id: bookingRequestId,
        notification_type: type,
        lesson_id: lesson.id,
      },
    });

    if (msgError) {
      console.error('[booking-notification] Message insert error:', msgError);
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    console.log(`[booking-notification] Sent ${type} notification for booking ${bookingRequestId}`);

    return new Response(JSON.stringify({ success: true, conversationId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[booking-notification] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
