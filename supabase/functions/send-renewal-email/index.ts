import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[SEND-RENEWAL-EMAIL] ${step}`, details ? JSON.stringify(details) : '');
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

function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  });
  return formatter.format(amount);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'your next billing cycle';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return 'your next billing cycle';
  }
}

function getRenewalEmailHtml(
  firstName: string,
  productName: string,
  amount: number,
  currency: string,
  nextBillingDate: string | null
): string {
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
          <div style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; padding: 15px; margin-bottom: 16px;">
            <span style="font-size: 32px;">🔄</span>
          </div>
          <h1 style="color: #1a1a1a; margin: 0 0 10px 0; font-size: 28px;">Subscription Renewed</h1>
          <p style="color: #666; font-size: 16px; margin: 0;">Your subscription has been successfully renewed${firstName ? `, ${firstName}` : ''}!</p>
        </div>

        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 16px 0;">Payment Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                <strong>${productName}</strong>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">
                ${formatCurrency(amount, currency)}
              </td>
            </tr>
          </table>
        </div>

        <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin-bottom: 30px;">
          <p style="color: #1e40af; font-size: 14px; margin: 0;">
            <strong>📅 Next Billing Date</strong><br>
            ${formatDate(nextBillingDate)}
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
            Continue enjoying your subscription benefits.
          </p>
          <a href="${Deno.env.get('SITE_URL') || 'https://worldmusicmethod.lovable.app'}/my-courses" style="display: inline-block; background-color: #BE1E2D; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Go to My Courses
          </a>
        </div>

        <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 30px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            <strong>Need to make changes?</strong><br>
            You can manage your subscription anytime from your account settings.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <div style="text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            <strong>World Music Method</strong><br>
            Learn authentic world music from master musicians
          </p>
          <p style="color: #999; font-size: 11px; margin-top: 12px;">
            Questions? Contact us at <a href="mailto:info@${Deno.env.get('SITE_DOMAIN') || 'worldmusicmethod.com'}" style="color: #BE1E2D; text-decoration: none;">info@${Deno.env.get('SITE_DOMAIN') || 'worldmusicmethod.com'}</a><br>
            <a href="${Deno.env.get('SITE_URL') || 'https://worldmusicmethod.lovable.app'}" style="color: #BE1E2D; text-decoration: none;">${Deno.env.get('SITE_DOMAIN') || 'worldmusicmethod.com'}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { email, firstName, productName, amount, currency, nextBillingDate } = await req.json();
    
    if (!email || !productName || amount === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Starting renewal email", { email, productName, amount });

    const accessKeyId = Deno.env.get('AWS_SES_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SES_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_SES_REGION') || 'eu-west-1';

    if (!accessKeyId || !secretAccessKey) {
      logStep("ERROR: Missing AWS SES credentials");
      
      await supabase.from('email_send_log').insert({
        email,
        subject: 'Your Subscription Has Been Renewed - World Music Method',
        status: 'failed',
        error_message: 'AWS SES credentials not configured',
      });
      
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fromAddress = `World Music Method <info@${Deno.env.get('SITE_DOMAIN') || 'worldmusicmethod.com'}>`;

    const result = await sendEmailViaSES(
      [email],
      'Your Subscription Has Been Renewed - World Music Method',
      getRenewalEmailHtml(firstName || '', productName, amount, currency || 'usd', nextBillingDate),
      fromAddress,
      accessKeyId,
      secretAccessKey,
      region
    );

    const logSubject = 'Your Subscription Has Been Renewed - World Music Method';
    
    if (!result.success) {
      logStep("ERROR: Failed to send email", { error: result.error });
      
      await supabase.from('email_send_log').insert({
        email,
        subject: logSubject,
        status: 'failed',
        error_message: result.error || 'Unknown error',
      });
      
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Renewal email sent", { messageId: result.messageId });
    
    await supabase.from('email_send_log').insert({
      email,
      subject: logSubject,
      status: 'sent',
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logStep("ERROR", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
