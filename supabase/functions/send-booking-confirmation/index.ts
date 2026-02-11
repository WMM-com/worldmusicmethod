import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as ics from "https://esm.sh/ics@3.8.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Generate .ics calendar file content using the ics library
function generateICS(
  title: string,
  startTime: string,
  endTime: string,
  description: string,
  roomUrl: string,
  durationMinutes: number,
  tutorName: string,
  tutorEmail: string,
  studentName: string,
  studentEmail: string
): string | null {
  const start = new Date(startTime);
  const event: ics.EventAttributes = {
    start: [
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      start.getUTCDate(),
      start.getUTCHours(),
      start.getUTCMinutes(),
    ],
    startInputType: 'utc',
    startOutputType: 'utc',
    duration: { minutes: durationMinutes },
    title,
    description,
    location: 'Online Video Call',
    url: roomUrl,
    status: 'CONFIRMED' as const,
    organizer: { name: tutorName, email: tutorEmail },
    attendees: [
      {
        name: studentName,
        email: studentEmail,
        rsvp: true,
        partstat: 'ACCEPTED',
        role: 'REQ-PARTICIPANT',
      },
      {
        name: tutorName,
        email: tutorEmail,
        rsvp: false,
        partstat: 'ACCEPTED',
        role: 'REQ-PARTICIPANT',
      },
    ],
    alarms: [
      { action: 'display', description: 'Lesson starts in 1 hour', trigger: { before: true, minutes: 60 } },
      { action: 'display', description: 'Lesson tomorrow', trigger: { before: true, minutes: 1440 } },
    ],
    method: 'REQUEST',
  };

  const { error, value } = ics.createEvent(event);
  if (error) {
    console.error('[send-booking-confirmation] ICS generation error:', error);
    return null;
  }
  return value!;
}

// Send email via SES using raw MIME (supports attachments)
async function sendRawEmailViaSES(
  to: string,
  subject: string,
  htmlBody: string,
  fromAddress: string,
  icsContent: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string
) {
  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, '')}`;
  const icsBase64 = btoa(icsContent);

  const rawMessage = [
    `From: ${fromAddress}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody,
    '',
    `--${boundary}`,
    'Content-Type: text/calendar; charset=UTF-8; method=REQUEST',
    'Content-Transfer-Encoding: base64',
    'Content-Disposition: attachment; filename="lesson.ics"',
    '',
    icsBase64,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const rawMessageBase64 = btoa(rawMessage);

  const url = new URL(`https://email.${region}.amazonaws.com/`);
  const params = new URLSearchParams();
  params.append('Action', 'SendRawEmail');
  params.append('Version', '2010-12-01');
  params.append('RawMessage.Data', rawMessageBase64);

  const body = params.toString();
  const encoder = new TextEncoder();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  // AWS SigV4 signing
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
  const responseText = await response.text();

  if (!response.ok) {
    console.error('[send-booking-confirmation] SES error:', responseText);
    throw new Error(`SES error: ${response.status}`);
  }

  return responseText;
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
    const region = Deno.env.get('AWS_SES_REGION') || 'eu-west-1';

    if (!accessKeyId || !secretAccessKey) {
      return new Response(JSON.stringify({ error: 'SES not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth check
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

    // Fetch booking with all details
    const { data: booking, error: bErr } = await supabase
      .from('booking_requests')
      .select('*, lesson:lessons(id, title, tutor_id, price, currency, duration_minutes)')
      .eq('id', bookingRequestId)
      .single();

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get confirmed slot
    const { data: slot } = await supabase
      .from('booking_slots')
      .select('start_time, end_time')
      .eq('request_id', bookingRequestId)
      .eq('status', 'selected_by_tutor')
      .order('start_time', { ascending: true })
      .limit(1)
      .single();

    if (!slot) {
      return new Response(JSON.stringify({ error: 'No confirmed slot found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get video room URL
    const siteUrl = (Deno.env.get('SITE_URL') || 'https://worldmusicmethod.com').replace(/\/$/, '');
    let roomUrl = `${siteUrl}/lessons`;
    if (booking.video_room_id) {
      const { data: room } = await supabase
        .from('video_rooms')
        .select('room_name')
        .eq('id', booking.video_room_id)
        .single();
      if (room) {
        roomUrl = `${siteUrl}/meet/${room.room_name}`;
      }
    }

    // Get student + tutor profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, timezone')
      .in('id', [booking.student_id, booking.lesson.tutor_id]);

    const student = profiles?.find(p => p.id === booking.student_id);
    const tutor = profiles?.find(p => p.id === booking.lesson.tutor_id);
    const lesson = booking.lesson;

    // Helper to format in a specific timezone
    const fmtDate = (iso: string, tz: string) => {
      const d = new Date(iso);
      try { return d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tz }); }
      catch { return d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }); }
    };
    const fmtTime = (iso: string, tz: string) => {
      const d = new Date(iso);
      try { return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }); }
      catch { return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); }
    };
    const fmtTzAbbr = (iso: string, tz: string) => {
      const d = new Date(iso);
      try { return d.toLocaleTimeString('en-GB', { timeZoneName: 'short', timeZone: tz }).split(' ').pop() || tz; }
      catch { return 'UTC'; }
    };

    // Generate .ics file
    const icsContent = generateICS(
      `Private Lesson: ${lesson.title}`,
      slot.start_time,
      slot.end_time,
      `Private lesson with ${tutor?.full_name || 'your tutor'}\nJoin: ${roomUrl}`,
      roomUrl,
      lesson.duration_minutes || 60,
      tutor?.full_name || 'Tutor',
      tutor?.email || `tutor@${Deno.env.get('SITE_DOMAIN') || 'worldmusicmethod.com'}`,
      student?.full_name || 'Student',
      student?.email || `student@${Deno.env.get('SITE_DOMAIN') || 'worldmusicmethod.com'}`
    );

    if (!icsContent) {
      console.error('[send-booking-confirmation] Failed to generate ICS file');
    }

    const fromAddress = `World Music Method <info@${Deno.env.get('SITE_DOMAIN') || 'worldmusicmethod.com'}>`;

    // Send to both student and tutor
    const recipients = [student, tutor].filter(p => p?.email);

    for (const recipient of recipients) {
      if (!recipient?.email) continue;

      const isStudent = recipient.id === booking.student_id;
      const otherName = isStudent ? (tutor?.full_name || 'your tutor') : (student?.full_name || 'the student');
      const recipientTz = (recipient as any)?.timezone || 'UTC';
      const formattedDate = fmtDate(slot.start_time, recipientTz);
      const formattedTime = `${fmtTime(slot.start_time, recipientTz)} – ${fmtTime(slot.end_time, recipientTz)} ${fmtTzAbbr(slot.start_time, recipientTz)}`;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <!-- Header -->
      <div style="background:#0a0a0a;padding:24px 32px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
          🎵 World Music Method
        </h1>
      </div>
      <!-- Content -->
      <div style="padding:32px;">
        <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-weight:700;">
          Lesson Confirmed!
        </h2>
        <p style="margin:0 0 20px;color:#666;font-size:15px;">
          Hi ${recipient?.full_name || 'there'},
        </p>
        <p style="margin:0 0 20px;color:#333;font-size:15px;">
          Your private lesson is confirmed! Here are the details:
        </p>

        <!-- Details Card -->
        <div style="background:#f8f8f8;border-radius:12px;padding:20px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#888;font-size:14px;width:100px;">📅 Date</td>
              <td style="padding:8px 0;color:#1a1a1a;font-size:14px;font-weight:600;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888;font-size:14px;">🕐 Time</td>
              <td style="padding:8px 0;color:#1a1a1a;font-size:14px;font-weight:600;">${formattedTime}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888;font-size:14px;">⏱ Duration</td>
              <td style="padding:8px 0;color:#1a1a1a;font-size:14px;font-weight:600;">${lesson.duration_minutes} minutes</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888;font-size:14px;">👤 With</td>
              <td style="padding:8px 0;color:#1a1a1a;font-size:14px;font-weight:600;">${otherName}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888;font-size:14px;">🎵 Lesson</td>
              <td style="padding:8px 0;color:#1a1a1a;font-size:14px;font-weight:600;">${lesson.title}</td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align:center;margin:24px 0;">
          <a href="${roomUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;padding:16px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
            Join Video Room
          </a>
        </div>

        <!-- Calendar attachment note -->
        <div style="background:#fef3c7;border-radius:8px;padding:14px 16px;margin:20px 0;">
          <p style="margin:0;color:#92400e;font-size:13px;">
            📎 <strong>Calendar file attached</strong> — Open the .ics file to add this lesson to your Google Calendar, Outlook, or Apple Calendar.
          </p>
        </div>

        <!-- Reminders info -->
        <div style="margin:20px 0 0;">
          <p style="margin:0 0 8px;color:#333;font-size:14px;font-weight:600;">
            Reminders:
          </p>
          <p style="margin:0 0 4px;color:#666;font-size:13px;">
            ⏰ You'll receive a reminder <strong>24 hours</strong> before your lesson
          </p>
          <p style="margin:0;color:#666;font-size:13px;">
            ⏰ And another <strong>1 hour</strong> before the lesson starts
          </p>
        </div>
      </div>
      <!-- Footer -->
      <div style="padding:20px 32px;background:#fafafa;border-top:1px solid #f0f0f0;">
        <p style="margin:0;color:#999;font-size:12px;text-align:center;">
          World Music Method — Private Lessons
        </p>
      </div>
    </div>
  </div>
</body>

</html>
      `;

      try {
        await sendRawEmailViaSES(
          recipient.email,
          `Lesson Confirmed: ${lesson.title} — ${formattedDate}`,
          html,
          fromAddress,
          icsContent || '',
          accessKeyId!,
          secretAccessKey!,
          region
        );
        console.log(`[send-booking-confirmation] Email sent to ${recipient.email}`);
      } catch (emailErr) {
        console.error(`[send-booking-confirmation] Failed for ${recipient.email}:`, emailErr);
      }
    }

    // Update booking: mark confirmation sent + store confirmed slot times
    await supabase
      .from('booking_requests')
      .update({
        confirmation_email_sent: true,
        confirmed_slot_start: slot.start_time,
        confirmed_slot_end: slot.end_time,
      })
      .eq('id', bookingRequestId);

    // Log in email_send_log
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    for (const recipient of recipients) {
      if (!recipient?.email) continue;
      await supabaseAdmin.from('email_send_log').insert({
        email: recipient.email,
        from_email: fromAddress,
        subject: `Lesson Confirmed: ${lesson.title}`,
        status: 'sent',
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[send-booking-confirmation] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
