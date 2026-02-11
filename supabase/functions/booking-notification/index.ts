import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── SES Email Sending (non-attachment version) ──────────────────────────────
async function sendEmailViaSES(
  to: string,
  subject: string,
  htmlBody: string,
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
  params.append('Message.Body.Html.Data', htmlBody);
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
  const responseText = await response.text();

  if (!response.ok) {
    console.error('[booking-notification] SES error:', responseText);
    throw new Error(`SES error: ${response.status}`);
  }
  return responseText;
}

// ── Shared email wrapper ────────────────────────────────────────────────────
const emailWrapper = (content: string) => `
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
        ${content}
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
</html>`;

// ── Time formatting (timezone-aware) ────────────────────────────────────────
function formatTime(isoStr: string, tz: string = 'UTC'): string {
  const d = new Date(isoStr);
  try {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });
  } catch {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  }
}
function formatDate(isoStr: string, tz: string = 'UTC'): string {
  const d = new Date(isoStr);
  try {
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz });
  } catch {
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
}
function getTzAbbr(isoStr: string, tz: string = 'UTC'): string {
  const d = new Date(isoStr);
  try {
    return d.toLocaleTimeString('en-GB', { timeZoneName: 'short', timeZone: tz }).split(' ').pop() || tz;
  } catch {
    return 'UTC';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accessKeyId = Deno.env.get('AWS_SES_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SES_SECRET_ACCESS_KEY');
    const sesRegion = Deno.env.get('AWS_SES_REGION') || 'eu-west-1';
    const sesConfigured = !!(accessKeyId && secretAccessKey);

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

    // Get profiles for student + tutor (including timezone)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, timezone')
      .in('id', [studentId, tutorId]);

    const student = profiles?.find(p => p.id === studentId);
    const tutor = profiles?.find(p => p.id === tutorId);
    const studentName = student?.full_name || 'A student';
    const tutorName = tutor?.full_name || 'Tutor';

    // Determine message content, recipient, and email
    let messageContent: string;
    let recipientId: string;
    let emailSubject = '';
    let emailHtml = '';
    let emailRecipient = '';

    const siteUrl = (Deno.env.get('SITE_URL') || 'https://worldmusicmethod.lovable.app').replace(/\/$/, '');
    const dashboardUrl = `${siteUrl}/lessons`;
    const fromAddress = `World Music Method <info@${Deno.env.get('SITE_DOMAIN') || 'worldmusicmethod.com'}>`;

    switch (type) {
      case 'new_request': {
        recipientId = tutorId;
        messageContent = `📩 New Lesson Request: "${lesson.title}". Check your dashboard to review proposed times.`;
        emailRecipient = tutor?.email || '';

        // Fetch proposed slots
        const { data: slots } = await supabase
          .from('booking_slots')
          .select('start_time, end_time')
          .eq('request_id', bookingRequestId)
          .eq('status', 'proposed')
          .order('start_time', { ascending: true });

        const tutorTz = (tutor as any)?.timezone || 'UTC';
        const slotsHtml = (slots || []).map(s => {
          const date = formatDate(s.start_time, tutorTz);
          const start = formatTime(s.start_time, tutorTz);
          const end = formatTime(s.end_time, tutorTz);
          const abbr = getTzAbbr(s.start_time, tutorTz);
          return `<li style="margin:6px 0;padding:10px 14px;background:#f8f8f8;border-radius:8px;border-left:3px solid #dc2626;font-size:14px;">
            📅 <strong>${date}</strong><br/>
            🕐 ${start} – ${end} ${abbr}
          </li>`;
        }).join('');

        emailSubject = `New Lesson Request from ${studentName}`;
        emailHtml = emailWrapper(`
          <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-weight:700;">
            New Lesson Request
          </h2>
          <p style="margin:0 0 20px;color:#666;font-size:15px;">
            Hi ${tutorName},
          </p>
          <p style="margin:0 0 12px;color:#333;font-size:15px;">
            <strong>${studentName}</strong> has requested a private lesson for
            "<strong>${lesson.title}</strong>".
          </p>
          <p style="margin:0 0 8px;color:#333;font-size:15px;">
            They've proposed the following times:
          </p>
          <ul style="list-style:none;padding:0;margin:0 0 24px;">
            ${slotsHtml || '<li style="color:#999;font-size:14px;">No specific times proposed</li>'}
          </ul>
          <div style="text-align:center;margin:24px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
              View &amp; Respond
            </a>
          </div>
          <p style="margin:0;color:#888;font-size:13px;">
            You can also reply directly via your messages on the platform.
          </p>
        `);
        break;
      }

      case 'tutor_reviewed':
        recipientId = studentId;
        messageContent = `✅ Your tutor has reviewed your request for "${lesson.title}" and selected a time. Please check your bookings.`;
        emailRecipient = student?.email || '';
        emailSubject = `${tutorName} reviewed your lesson request — ${lesson.title}`;
        emailHtml = emailWrapper(`
          <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-weight:700;">
            Tutor Reviewed Your Request
          </h2>
          <p style="margin:0 0 20px;color:#666;font-size:15px;">
            Hi ${studentName},
          </p>
          <p style="margin:0 0 16px;color:#333;font-size:15px;">
            <strong>${tutorName}</strong> has reviewed your lesson request for
            "<strong>${lesson.title}</strong>" and selected a time slot.
          </p>
          <p style="margin:0 0 24px;color:#333;font-size:15px;">
            Please check your bookings to see the confirmed time and complete payment.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
              View Booking
            </a>
          </div>
        `);
        break;

      case 'payment_pending':
        recipientId = studentId;
        messageContent = `💳 Your lesson "${lesson.title}" is confirmed by the tutor! Please complete payment to finalize your booking.`;
        emailRecipient = student?.email || '';
        emailSubject = `Payment required — ${lesson.title}`;
        emailHtml = emailWrapper(`
          <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-weight:700;">
            💳 Payment Required
          </h2>
          <p style="margin:0 0 20px;color:#666;font-size:15px;">
            Hi ${studentName},
          </p>
          <p style="margin:0 0 16px;color:#333;font-size:15px;">
            Great news! <strong>${tutorName}</strong> has confirmed your lesson
            "<strong>${lesson.title}</strong>".
          </p>
          <p style="margin:0 0 24px;color:#333;font-size:15px;">
            Please complete payment to finalize your booking and secure your spot.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
              Pay Now
            </a>
          </div>
        `);
        break;

      case 'confirmed':
        recipientId = tutorId;
        messageContent = `🎉 Payment received for "${lesson.title}"! The lesson is confirmed. A video room has been created for your session.`;
        // Confirmation email is handled by send-booking-confirmation, just notify tutor via in-app
        break;

      case 'cancelled':
        recipientId = user.id === studentId ? tutorId : studentId;
        messageContent = `❌ The booking request for "${lesson.title}" has been cancelled.`;
        const cancelledRecipient = recipientId === tutorId ? tutor : student;
        const cancelledByName = user.id === studentId ? studentName : tutorName;
        emailRecipient = cancelledRecipient?.email || '';
        emailSubject = `Lesson Cancelled — ${lesson.title}`;
        emailHtml = emailWrapper(`
          <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-weight:700;">
            Lesson Cancelled
          </h2>
          <p style="margin:0 0 20px;color:#666;font-size:15px;">
            Hi ${cancelledRecipient?.full_name || 'there'},
          </p>
          <p style="margin:0 0 16px;color:#333;font-size:15px;">
            The booking for "<strong>${lesson.title}</strong>" has been cancelled by
            <strong>${cancelledByName}</strong>.
          </p>
          <p style="margin:0 0 24px;color:#333;font-size:15px;">
            If you have any questions, you can reach out via your messages on the platform.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#333;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
              View Dashboard
            </a>
          </div>
        `);
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // ── Send email via SES (if configured and we have a recipient) ──────────
    if (sesConfigured && emailRecipient && emailHtml) {
      try {
        await sendEmailViaSES(emailRecipient, emailSubject, emailHtml, fromAddress, accessKeyId!, secretAccessKey!, sesRegion);
        console.log(`[booking-notification] Email sent to ${emailRecipient} (${type})`);

        // Log it
        await supabase.from('email_send_log').insert({
          email: emailRecipient,
          from_email: fromAddress,
          subject: emailSubject,
          status: 'sent',
        });
      } catch (emailErr) {
        console.error(`[booking-notification] Email failed for ${emailRecipient}:`, emailErr);
        await supabase.from('email_send_log').insert({
          email: emailRecipient,
          from_email: fromAddress,
          subject: emailSubject,
          status: 'failed',
          error_message: String(emailErr),
        });
      }
    }

    // ── Send in-app system message ──────────────────────────────────────────
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
