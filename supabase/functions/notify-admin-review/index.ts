import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AWS SES signing
async function signRequest(
  method: string,
  url: URL,
  body: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  service: string
): Promise<Headers> {
  const encoder = new TextEncoder();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const headers = new Headers({
    'Content-Type': 'application/x-www-form-urlencoded',
    'Host': url.host,
    'X-Amz-Date': amzDate,
  });

  const canonicalUri = url.pathname;
  const signedHeaders = 'content-type;host;x-amz-date';

  const payloadHash = await crypto.subtle.digest('SHA-256', encoder.encode(body));
  const payloadHashHex = Array.from(new Uint8Array(payloadHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const canonicalHeaders =
    `content-type:${headers.get('Content-Type')}\n` +
    `host:${url.host}\n` +
    `x-amz-date:${amzDate}\n`;

  const canonicalRequest = [method, canonicalUri, '', canonicalHeaders, signedHeaders, payloadHashHex].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalRequestHash = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const stringToSign = [algorithm, amzDate, credentialScope, canonicalRequestHashHex].join('\n');

  const getSignatureKey = async (key: string, ds: string, rn: string, sn: string) => {
    const kDate = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', encoder.encode('AWS4' + key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(ds));
    const kRegion = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kDate, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(rn));
    const kService = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(sn));
    return await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode('aws4_request'));
  };

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', signingKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(stringToSign));
  const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

  headers.set('Authorization', `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`);
  return headers;
}

function renderStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function buildEmailHtml(
  userName: string,
  courseName: string,
  rating: number,
  reviewText: string | null,
  promptQuestion: string | null,
  promptAnswer: string | null,
  adminUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#141414;border-radius:12px;overflow:hidden;border:1px solid #262626;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7f1d1d,#991b1b);padding:28px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">New Review Submitted</h1>
          <p style="margin:8px 0 0;color:#fca5a5;font-size:14px;">A student has left a review that needs your approval</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding-bottom:20px;">
              <p style="margin:0 0 4px;color:#a3a3a3;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Student</p>
              <p style="margin:0;color:#ffffff;font-size:16px;font-weight:600;">${userName}</p>
            </td></tr>
            <tr><td style="padding-bottom:20px;">
              <p style="margin:0 0 4px;color:#a3a3a3;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Course</p>
              <p style="margin:0;color:#ffffff;font-size:16px;font-weight:600;">${courseName}</p>
            </td></tr>
            <tr><td style="padding-bottom:20px;">
              <p style="margin:0 0 4px;color:#a3a3a3;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Rating</p>
              <p style="margin:0;color:#eab308;font-size:22px;letter-spacing:2px;">${renderStars(rating)}</p>
            </td></tr>
            ${promptQuestion && promptAnswer ? `
            <tr><td style="padding-bottom:20px;background:#1a1a1a;border-radius:8px;padding:16px;">
              <p style="margin:0 0 6px;color:#a3a3a3;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Prompt: ${promptQuestion}</p>
              <p style="margin:0;color:#e5e5e5;font-size:14px;line-height:1.5;">${promptAnswer}</p>
            </td></tr>` : ''}
            ${reviewText ? `
            <tr><td style="padding-bottom:20px;padding-top:12px;">
              <p style="margin:0 0 6px;color:#a3a3a3;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Additional Comments</p>
              <p style="margin:0;color:#e5e5e5;font-size:14px;line-height:1.5;">${reviewText}</p>
            </td></tr>` : ''}
          </table>
          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="padding-top:16px;">
            <tr><td align="center">
              <a href="${adminUrl}" style="display:inline-block;background:#991b1b;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">
                Review Now
              </a>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #262626;">
          <p style="margin:0;color:#525252;font-size:12px;text-align:center;">World Music Method • Admin Notification</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const accessKeyId = Deno.env.get('AWS_SES_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SES_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_SES_REGION') || 'eu-west-1';

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { review_id, user_name, course_name, rating, review_text, prompt_question, prompt_answer } = await req.json();

    if (!review_id || !user_name || !course_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all admin user IDs
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError || !adminRoles?.length) {
      console.error('Failed to fetch admin roles:', rolesError);
      return new Response(JSON.stringify({ error: 'No admins found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminIds = adminRoles.map(r => r.user_id);

    // Create in-app notifications for all admins
    const notificationInserts = adminIds.map(adminId => ({
      user_id: adminId,
      type: 'review_submitted',
      title: `${user_name} submitted a review for ${course_name}`,
      message: `${rating} star review. Review now to approve or reject.`,
      reference_id: review_id,
      reference_type: 'review',
    }));

    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationInserts);

    if (notifError) {
      console.error('Failed to create notifications:', notifError);
    }

    // Send email to admin emails
    if (accessKeyId && secretAccessKey) {
      // Get admin emails from profiles
      const { data: adminProfiles } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .in('id', adminIds);

      const adminEmails = adminProfiles
        ?.map(p => p.email)
        .filter((e): e is string => !!e) || [];

      if (adminEmails.length > 0) {
        const adminUrl = 'https://worldmusicmethod.lovable.app/admin';
        const html = buildEmailHtml(user_name, course_name, rating, review_text, prompt_question, prompt_answer, adminUrl);

        const fromAddress = 'World Music Method <info@worldmusicmethod.com>';
        const sesUrl = new URL(`https://email.${region}.amazonaws.com/`);
        const params = new URLSearchParams();
        params.append('Action', 'SendEmail');
        params.append('Version', '2010-12-01');
        params.append('Source', fromAddress);

        adminEmails.forEach((email, i) => {
          params.append(`Destination.ToAddresses.member.${i + 1}`, email);
        });

        params.append('Message.Subject.Data', `New Review: ${user_name} reviewed ${course_name}`);
        params.append('Message.Subject.Charset', 'UTF-8');
        params.append('Message.Body.Html.Data', html);
        params.append('Message.Body.Html.Charset', 'UTF-8');

        const body = params.toString();
        const headers = await signRequest('POST', sesUrl, body, accessKeyId, secretAccessKey, region, 'ses');

        const response = await fetch(sesUrl.toString(), { method: 'POST', headers, body });
        if (!response.ok) {
          console.error('SES send failed:', await response.text());
        } else {
          console.log('Admin notification email sent to:', adminEmails.join(', '));
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in notify-admin-review:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
