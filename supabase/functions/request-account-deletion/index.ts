import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AWS SES signing (same as other functions)
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
  const canonicalQueryString = '';
  const signedHeaders = 'content-type;host;x-amz-date';
  
  const payloadHash = await crypto.subtle.digest('SHA-256', encoder.encode(body));
  const payloadHashHex = Array.from(new Uint8Array(payloadHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const canonicalHeaders = 
    `content-type:${headers.get('Content-Type')}\n` +
    `host:${url.host}\n` +
    `x-amz-date:${amzDate}\n`;

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHashHex,
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  
  const canonicalRequestHash = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHashHex,
  ].join('\n');

  const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
    const kDate = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', encoder.encode('AWS4' + key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode(dateStamp)
    );
    const kRegion = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', kDate, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode(regionName)
    );
    const kService = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode(serviceName)
    );
    return await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode('aws4_request')
    );
  };

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', signingKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode(stringToSign)
  );
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  headers.set('Authorization', `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`);
  return headers;
}

async function sendEmailViaSES(
  to: string,
  subject: string,
  html: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): Promise<boolean> {
  const url = new URL(`https://email.${region}.amazonaws.com/`);
  
  const params = new URLSearchParams();
  params.append('Action', 'SendEmail');
  params.append('Version', '2010-12-01');
  params.append('Source', `World Music Method <info@${Deno.env.get('SITE_DOMAIN') || 'worldmusicmethod.com'}>`);
  params.append('Destination.ToAddresses.member.1', to);
  params.append('Message.Subject.Data', subject);
  params.append('Message.Subject.Charset', 'UTF-8');
  params.append('Message.Body.Html.Data', html);
  params.append('Message.Body.Html.Charset', 'UTF-8');

  const body = params.toString();
  const headers = await signRequest('POST', url, body, accessKeyId, secretAccessKey, region, 'ses');

  try {
    const response = await fetch(url.toString(), { method: 'POST', headers, body });
    return response.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check for existing pending request
    const { data: existingRequest } = await adminClient
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingRequest) {
      return new Response(
        JSON.stringify({ error: 'A deletion request is already pending. Check your email.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create deletion request
    const { data: request, error: insertError } = await adminClient
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        email: user.email,
      })
      .select()
      .single();

    if (insertError || !request) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create deletion request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send confirmation email
    const confirmUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/confirm-account-deletion?token=${request.token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #dc2626; margin: 0 0 20px; font-size: 24px;">⚠️ Account Deletion Request</h1>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            You have requested to permanently delete your World Music Method account. This action will:
          </p>
          <ul style="color: #666; font-size: 14px; line-height: 1.8;">
            <li>Delete all your profile information</li>
            <li>Remove all your uploaded media files</li>
            <li>Delete your messages and posts</li>
            <li>Remove your course enrollments</li>
            <li>Cancel any active subscriptions</li>
          </ul>
          <p style="color: #dc2626; font-weight: bold; font-size: 14px;">
            This action cannot be undone!
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Confirm Account Deletion
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link expires in 24 hours. If you didn't request this, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            World Music Method
          </p>
        </div>
      </body>
      </html>
    `;

    const accessKeyId = Deno.env.get('AWS_SES_ACCESS_KEY_ID')!;
    const secretAccessKey = Deno.env.get('AWS_SES_SECRET_ACCESS_KEY')!;
    const region = Deno.env.get('AWS_SES_REGION') || 'eu-west-1';

    const emailSent = await sendEmailViaSES(
      user.email!,
      'Confirm Account Deletion - World Music Method',
      html,
      accessKeyId,
      secretAccessKey,
      region
    );

    if (!emailSent) {
      console.error('Failed to send deletion confirmation email');
    }

    console.log(`Account deletion requested for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Confirmation email sent. Please check your inbox.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
