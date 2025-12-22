import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AWS SES API Signature V4 implementation
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
  
  const canonicalRequestHash = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(canonicalRequest)
  );
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHashHex,
  ].join('\n');

  const getSignatureKey = async (
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ) => {
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
    const kSigning = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode('aws4_request')
    );
    return kSigning;
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

  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;
  headers.set('Authorization', authorizationHeader);

  return headers;
}

async function sendEmailViaSES(
  to: string[],
  subject: string,
  html: string,
  from: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = new URL(`https://email.${region}.amazonaws.com/`);
  
  const params = new URLSearchParams();
  params.append('Action', 'SendEmail');
  params.append('Version', '2010-12-01');
  params.append('Source', from);
  
  to.forEach((email, index) => {
    params.append(`Destination.ToAddresses.member.${index + 1}`, email);
  });
  
  params.append('Message.Subject.Data', subject);
  params.append('Message.Subject.Charset', 'UTF-8');
  params.append('Message.Body.Html.Data', html);
  params.append('Message.Body.Html.Charset', 'UTF-8');

  const body = params.toString();
  const headers = await signRequest('POST', url, body, accessKeyId, secretAccessKey, region, 'ses');

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body,
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('SES Error Response:', responseText);
      const errorMatch = responseText.match(/<Message>(.*?)<\/Message>/);
      const errorMessage = errorMatch ? errorMatch[1] : 'Unknown SES error';
      return { success: false, error: errorMessage };
    }

    const messageIdMatch = responseText.match(/<MessageId>(.*?)<\/MessageId>/);
    const messageId = messageIdMatch ? messageIdMatch[1] : undefined;
    
    return { success: true, messageId };
  } catch (error: unknown) {
    console.error('SES Request Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

function getPasswordResetEmailHtml(resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">Reset Your Password</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          You requested to reset your password. Click the button below to create a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          This link will expire in 24 hours. If you didn't request this, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          World Music Method<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    </body>
    </html>
  `;
}

function getEmailConfirmationHtml(confirmLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">Confirm Your Email</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Welcome to World Music Method! Please confirm your email address by clicking the button below:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Confirm Email
          </a>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          If you didn't create an account, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          World Music Method<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    </body>
    </html>
  `;
}

function getEmailChangeHtml(confirmLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">Confirm Email Change</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          You requested to change your email address. Click the button below to confirm:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Confirm New Email
          </a>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          If you didn't request this change, please contact support immediately.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          World Music Method<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessKeyId = Deno.env.get('AWS_SES_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SES_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_SES_REGION') || 'eu-west-1';

    if (!accessKeyId || !secretAccessKey) {
      console.error('Missing AWS SES credentials');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    console.log('Received auth email request:', JSON.stringify(body, null, 2));

    // Extract data from Supabase auth hook payload
    const { email, email_action_type, redirect_to, token_hash } = body;

    if (!email || !email_action_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const siteUrl = 'https://worldmusicmethod.com';

    let subject: string;
    let html: string;
    let confirmLink: string;

    // Build the confirmation link
    const type = email_action_type === 'recovery' ? 'recovery' : 
                 email_action_type === 'signup' ? 'signup' : 
                 email_action_type === 'email_change' ? 'email_change' : 'signup';
    
    confirmLink = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${type}&redirect_to=${encodeURIComponent(redirect_to || siteUrl)}`;

    switch (email_action_type) {
      case 'recovery':
        subject = 'Reset Your Password - World Music Method';
        html = getPasswordResetEmailHtml(confirmLink);
        break;
      case 'signup':
        subject = 'Confirm Your Email - World Music Method';
        html = getEmailConfirmationHtml(confirmLink);
        break;
      case 'email_change':
        subject = 'Confirm Email Change - World Music Method';
        html = getEmailChangeHtml(confirmLink);
        break;
      default:
        subject = 'World Music Method';
        html = getEmailConfirmationHtml(confirmLink);
    }

    const fromAddress = 'World Music Method <info@worldmusicmethod.com>';

    console.log(`Sending ${email_action_type} email to ${email}`);

    const result = await sendEmailViaSES(
      [email],
      subject,
      html,
      fromAddress,
      accessKeyId,
      secretAccessKey,
      region
    );

    if (!result.success) {
      console.error('Failed to send auth email:', result.error);
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Auth email sent successfully, MessageId:', result.messageId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in send-auth-email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
