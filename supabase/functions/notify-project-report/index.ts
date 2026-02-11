import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFY-PROJECT-REPORT] ${step}${d}`);
};

// ─── AWS SES signing (same helper used across email functions) ──────────────
async function signRequest(
  method: string,
  url: URL,
  body: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  service: string,
): Promise<Headers> {
  const enc = new TextEncoder();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const headers = new Headers({
    'Content-Type': 'application/x-www-form-urlencoded',
    Host: url.host,
    'X-Amz-Date': amzDate,
  });

  const payloadHash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(body))),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const canonicalHeaders =
    `content-type:${headers.get('Content-Type')}\n` +
    `host:${url.host}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = 'content-type;host;x-amz-date';

  const canonicalRequest = [
    method,
    url.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const crHash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', enc.encode(canonicalRequest)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const stringToSign = [algorithm, amzDate, credentialScope, crHash].join('\n');

  const importKey = (raw: BufferSource | string) =>
    crypto.subtle.importKey(
      'raw',
      typeof raw === 'string' ? enc.encode(raw) : raw,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

  let key = await crypto.subtle.sign(
    'HMAC',
    await importKey('AWS4' + secretAccessKey),
    enc.encode(dateStamp),
  );
  key = await crypto.subtle.sign('HMAC', await importKey(key), enc.encode(region));
  key = await crypto.subtle.sign('HMAC', await importKey(key), enc.encode(service));
  key = await crypto.subtle.sign(
    'HMAC',
    await importKey(key),
    enc.encode('aws4_request'),
  );

  const sig = Array.from(
    new Uint8Array(
      await crypto.subtle.sign('HMAC', await importKey(key), enc.encode(stringToSign)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  headers.set(
    'Authorization',
    `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
  );

  return headers;
}

// ─── Build themed HTML email ───────────────────────────────────────────────
function buildReportEmail(
  reporterName: string,
  ownerName: string,
  issueText: string,
  projectTitle: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#121212;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#121212;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;border-radius:12px;overflow:hidden;border:1px solid #4a4a4a;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#BE1E2D 0%,#8B1621 100%);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">⚠️ Project Issue Reported</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="color:#f5f5f5;font-size:15px;line-height:1.6;margin:0 0 20px;">
              <strong style="color:#ffffff;">${escapeHtml(reporterName)}</strong> reported an issue about a project listed on
              <strong style="color:#ffffff;">${escapeHtml(ownerName)}'s</strong> profile.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background-color:#1a1a1a;border-left:4px solid #BE1E2D;border-radius:0 8px 8px 0;padding:16px 20px;">
                  <p style="color:#bfbfbf;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 6px;">Project</p>
                  <p style="color:#ffffff;font-size:14px;font-weight:500;margin:0;">${escapeHtml(projectTitle)}</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background-color:#1a1a1a;border-left:4px solid #CCC016;border-radius:0 8px 8px 0;padding:16px 20px;">
                  <p style="color:#bfbfbf;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 6px;">Reported Issue</p>
                  <p style="color:#f5f5f5;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(issueText)}</p>
                </td>
              </tr>
            </table>

            <p style="color:#bfbfbf;font-size:13px;margin:0;">Please review this report and take appropriate action.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #4a4a4a;padding:20px 32px;">
            <p style="color:#757575;font-size:12px;margin:0;text-align:center;">World Music Method — Admin Notification</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Main handler ──────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1. Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      logStep('Unauthorized', { error: userError?.message });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Authenticated', { userId: user.id });

    // 2. Parse body
    const { project_id, profile_owner_id, message, project_title } = await req.json();
    if (!project_id || !profile_owner_id || !message) {
      return new Response(
        JSON.stringify({ error: 'project_id, profile_owner_id, and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Fetch reporter & owner profiles
    const [reporterRes, ownerRes] = await Promise.all([
      admin.from('profiles').select('full_name, username').eq('id', user.id).maybeSingle(),
      admin.from('profiles').select('full_name, username').eq('id', profile_owner_id).maybeSingle(),
    ]);

    const reporterName = reporterRes.data?.full_name || user.email || 'A user';
    const ownerName = ownerRes.data?.full_name || 'an artist';
    const title = project_title || 'Untitled project';

    logStep('Profiles fetched', { reporterName, ownerName });

    // 4. Get admin user IDs
    const { data: admins } = await admin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!admins || admins.length === 0) {
      logStep('No admins found — skipping notifications');
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Admins found', { count: admins.length });

    // 5. Create in-app notifications for each admin
    const notifTitle = 'Project Issue Reported';
    const notifMessage = `${reporterName} reported an issue about the project "${title}" listed on ${ownerName}'s profile.\n\nIssue: "${message.trim().slice(0, 300)}"`;

    const notifications = admins.map((a) => ({
      user_id: a.user_id,
      type: 'project_report',
      title: notifTitle,
      message: notifMessage,
      reference_id: project_id,
      reference_type: 'project',
      from_user_id: user.id,
    }));

    const { error: notifError } = await admin.from('notifications').insert(notifications);
    if (notifError) {
      logStep('Notification insert error', { error: notifError.message });
    } else {
      logStep('Notifications created', { count: notifications.length });
    }

    // 6. Send email to each admin
    const accessKeyId = Deno.env.get('AWS_SES_ACCESS_KEY_ID') || '';
    const secretAccessKey = Deno.env.get('AWS_SES_SECRET_ACCESS_KEY') || '';
    const region = Deno.env.get('AWS_SES_REGION') || 'eu-west-2';

    if (accessKeyId && secretAccessKey) {
      // Get admin emails from profiles
      const adminIds = admins.map((a) => a.user_id);
      const { data: adminProfiles } = await admin
        .from('profiles')
        .select('id, email')
        .in('id', adminIds);

      const adminEmails = (adminProfiles || [])
        .map((p) => p.email)
        .filter(Boolean) as string[];

      logStep('Admin emails', { count: adminEmails.length });

      if (adminEmails.length > 0) {
        const htmlBody = buildReportEmail(reporterName, ownerName, message.trim(), title);
        const sesUrl = new URL(`https://email.${region}.amazonaws.com/`);

        for (const email of adminEmails) {
          try {
            const params = new URLSearchParams();
            params.append('Action', 'SendEmail');
            params.append('Version', '2010-12-01');
            params.append('Source', `World Music Method <info@${Deno.env.get('SITE_DOMAIN') || 'worldmusicmethod.com'}>`);
            params.append('Destination.ToAddresses.member.1', email);
            params.append('Message.Subject.Data', `Project Issue Reported: ${title}`);
            params.append('Message.Subject.Charset', 'UTF-8');
            params.append('Message.Body.Html.Data', htmlBody);
            params.append('Message.Body.Html.Charset', 'UTF-8');

            const reqBody = params.toString();
            const sesHeaders = await signRequest(
              'POST', sesUrl, reqBody, accessKeyId, secretAccessKey, region, 'ses',
            );

            const sesRes = await fetch(sesUrl.toString(), {
              method: 'POST',
              headers: sesHeaders,
              body: reqBody,
            });

            if (!sesRes.ok) {
              const errText = await sesRes.text();
              logStep('SES send failed', { email, error: errText });
            } else {
              logStep('Email sent', { email });
            }

            // Log the send
            await admin.from('email_send_log').insert({
              email,
              from_email: `info@${Deno.env.get('SITE_DOMAIN') || 'worldmusicmethod.com'}`,
              subject: `Project Issue Reported: ${title}`,
              status: sesRes.ok ? 'sent' : 'failed',
            });
          } catch (err) {
            logStep('Email error', { email, error: String(err) });
          }
        }
      }
    } else {
      logStep('SES credentials not configured — skipping email');
    }

    return new Response(
      JSON.stringify({ success: true, notified: admins.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
