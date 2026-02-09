import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reuse the SES signing from send-email-ses but simplified for service-role calls
async function sendEmailViaSES(
  to: string,
  subject: string,
  html: string,
  fromAddress: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string
) {
  const url = new URL(`https://email.${region}.amazonaws.com/`);
  const params = new URLSearchParams();
  params.append('Action', 'SendEmail');
  params.append('Version', '2010-12-01');
  params.append('Source', fromAddress);
  params.append('Destination.ToAddresses.member.1', to);
  params.append('Message.Subject.Data', subject);
  params.append('Message.Subject.Charset', 'UTF-8');
  params.append('Message.Body.Html.Data', html);
  params.append('Message.Body.Html.Charset', 'UTF-8');

  const body = params.toString();
  const encoder = new TextEncoder();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const headers = new Headers({
    'Content-Type': 'application/x-www-form-urlencoded',
    'Host': url.host,
    'X-Amz-Date': amzDate,
  });

  const signedHeaders = 'content-type;host;x-amz-date';
  const payloadHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(body))))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const canonicalHeaders =
    `content-type:${headers.get('Content-Type')}\n` +
    `host:${url.host}\n` +
    `x-amz-date:${amzDate}\n`;

  const canonicalRequest = ['POST', url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`;
  const canonicalRequestHash = Array.from(new Uint8Array(
    await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest))
  )).map(b => b.toString(16).padStart(2, '0')).join('');

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join('\n');

  const getSignatureKey = async (key: string, ds: string, rg: string, sv: string) => {
    const kDate = await crypto.subtle.sign('HMAC',
      await crypto.subtle.importKey('raw', encoder.encode('AWS4' + key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode(ds));
    const kRegion = await crypto.subtle.sign('HMAC',
      await crypto.subtle.importKey('raw', kDate, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode(rg));
    const kService = await crypto.subtle.sign('HMAC',
      await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode(sv));
    return await crypto.subtle.sign('HMAC',
      await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode('aws4_request'));
  };

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, 'ses');
  const signature = Array.from(new Uint8Array(
    await crypto.subtle.sign('HMAC',
      await crypto.subtle.importKey('raw', signingKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode(stringToSign))
  )).map(b => b.toString(16).padStart(2, '0')).join('');

  headers.set('Authorization', `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`);

  const response = await fetch(url.toString(), { method: 'POST', headers, body });
  const text = await response.text();
  if (!response.ok) {
    console.error('[process-booking-reminders] SES error:', text);
    throw new Error(`SES error: ${response.status}`);
  }
  return text;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accessKeyId = Deno.env.get('AWS_SES_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SES_SECRET_ACCESS_KEY');
    const sesRegion = Deno.env.get('AWS_SES_REGION') || 'eu-west-1';

    if (!accessKeyId || !secretAccessKey) {
      console.error('[process-booking-reminders] SES not configured');
      return new Response(JSON.stringify({ error: 'SES not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const fromAddress = 'World Music Method <info@worldmusicmethod.com>';
    let sent24h = 0;
    let sent1h = 0;
    let inAppSent = 0;

    // === 24-HOUR REMINDERS ===
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { data: reminders24h } = await supabase
      .from('booking_requests')
      .select('id, student_id, confirmed_slot_start, confirmed_slot_end, video_room_id, lesson:lessons(title, tutor_id, duration_minutes)')
      .eq('status', 'confirmed')
      .eq('reminder_24h_sent', false)
      .not('confirmed_slot_start', 'is', null)
      .lte('confirmed_slot_start', in24h.toISOString())
      .gt('confirmed_slot_start', now.toISOString());

    for (const booking of reminders24h || []) {
      const lesson = booking.lesson as any;
      const profileIds = [booking.student_id, lesson.tutor_id];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', profileIds);

      let roomUrl = 'https://worldmusicmethod.lovable.app/lessons';
      if (booking.video_room_id) {
        const { data: room } = await supabase
          .from('video_rooms')
          .select('room_name')
          .eq('id', booking.video_room_id)
          .single();
        if (room) roomUrl = `https://worldmusicmethod.lovable.app/meet/${room.room_name}`;
      }

      const startDate = new Date(booking.confirmed_slot_start!);
      const formattedDate = startDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const formattedTime = startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      for (const profile of profiles || []) {
        if (!profile.email) continue;
        const isStudent = profile.id === booking.student_id;
        const otherName = isStudent
          ? (profiles?.find(p => p.id === lesson.tutor_id)?.full_name || 'your tutor')
          : (profiles?.find(p => p.id === booking.student_id)?.full_name || 'the student');

        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px;">⏰ Lesson Tomorrow!</h1>
            <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <h2 style="margin: 0 0 12px; color: #333;">${lesson.title}</h2>
              <p style="margin: 4px 0; color: #666;">📅 <strong>${formattedDate}</strong></p>
              <p style="margin: 4px 0; color: #666;">🕐 <strong>${formattedTime} UTC</strong></p>
              <p style="margin: 4px 0; color: #666;">👤 With <strong>${otherName}</strong></p>
            </div>
            <a href="${roomUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Join Video Room
            </a>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">World Music Method — Private Lessons</p>
          </div>
        `;

        try {
          await sendEmailViaSES(profile.email, `Reminder: ${lesson.title} — Tomorrow at ${formattedTime} UTC`, html, fromAddress, accessKeyId!, secretAccessKey!, sesRegion);
          sent24h++;
        } catch (e) {
          console.error(`[process-booking-reminders] 24h email failed for ${profile.email}:`, e);
        }
      }

      await supabase.from('booking_requests').update({ reminder_24h_sent: true }).eq('id', booking.id);
    }

    // === 1-HOUR REMINDERS ===
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const { data: reminders1h } = await supabase
      .from('booking_requests')
      .select('id, student_id, confirmed_slot_start, confirmed_slot_end, video_room_id, lesson:lessons(title, tutor_id, duration_minutes)')
      .eq('status', 'confirmed')
      .eq('reminder_1h_sent', false)
      .not('confirmed_slot_start', 'is', null)
      .lte('confirmed_slot_start', in1h.toISOString())
      .gt('confirmed_slot_start', now.toISOString());

    for (const booking of reminders1h || []) {
      const lesson = booking.lesson as any;
      const profileIds = [booking.student_id, lesson.tutor_id];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', profileIds);

      let roomUrl = 'https://worldmusicmethod.lovable.app/lessons';
      if (booking.video_room_id) {
        const { data: room } = await supabase
          .from('video_rooms')
          .select('room_name')
          .eq('id', booking.video_room_id)
          .single();
        if (room) roomUrl = `https://worldmusicmethod.lovable.app/meet/${room.room_name}`;
      }

      const startDate = new Date(booking.confirmed_slot_start!);
      const formattedTime = startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      // Send email reminders
      for (const profile of profiles || []) {
        if (!profile.email) continue;
        const otherName = profile.id === booking.student_id
          ? (profiles?.find(p => p.id === lesson.tutor_id)?.full_name || 'your tutor')
          : (profiles?.find(p => p.id === booking.student_id)?.full_name || 'the student');

        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px;">🔔 Lesson Starts in 1 Hour!</h1>
            <div style="background: #fef3cd; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #ffc107;">
              <h2 style="margin: 0 0 8px; color: #333;">${lesson.title}</h2>
              <p style="margin: 4px 0; color: #666;">🕐 <strong>Starting at ${formattedTime} UTC</strong></p>
              <p style="margin: 4px 0; color: #666;">👤 With <strong>${otherName}</strong></p>
            </div>
            <a href="${roomUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              🎥 Join Now
            </a>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">World Music Method — Private Lessons</p>
          </div>
        `;

        try {
          await sendEmailViaSES(profile.email, `Starting Soon: ${lesson.title} — in 1 hour!`, html, fromAddress, accessKeyId!, secretAccessKey!, sesRegion);
          sent1h++;
        } catch (e) {
          console.error(`[process-booking-reminders] 1h email failed for ${profile.email}:`, e);
        }
      }

      // Send in-app DM notification (system message)
      const participants = [booking.student_id, lesson.tutor_id].sort();
      const { data: existingConvs } = await supabase
        .from('conversations')
        .select('id, participant_ids')
        .contains('participant_ids', participants);

      const matchingConv = existingConvs?.find(
        c => c.participant_ids.length === 2 &&
             c.participant_ids.includes(booking.student_id) &&
             c.participant_ids.includes(lesson.tutor_id)
      );

      if (matchingConv) {
        await supabase.from('messages').insert({
          conversation_id: matchingConv.id,
          sender_id: lesson.tutor_id, // System message attributed to tutor
          content: `🔔 Your lesson "${lesson.title}" starts in 1 hour! [Join Video Room](${roomUrl})`,
          message_type: 'system',
          metadata: {
            notification_type: 'reminder_1h',
            booking_request_id: booking.id,
            room_url: roomUrl,
          },
        });

        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', matchingConv.id);
        
        inAppSent++;
      }

      await supabase.from('booking_requests').update({ reminder_1h_sent: true }).eq('id', booking.id);
    }

    console.log(`[process-booking-reminders] Done: 24h=${sent24h}, 1h=${sent1h}, inApp=${inAppSent}`);

    return new Response(JSON.stringify({
      success: true,
      sent: { reminder_24h: sent24h, reminder_1h: sent1h, in_app: inAppSent },
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[process-booking-reminders] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
