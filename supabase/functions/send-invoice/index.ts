import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

// Validation helpers
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && EMAIL_REGEX.test(value) && value.length <= 255;
}

function isValidString(value: unknown, maxLength: number = 200): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function validateInvoiceRequest(body: unknown): { 
  valid: true; 
  data: { invoiceId: string; recipientEmail: string; senderName?: string; senderEmail?: string } 
} | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }
  
  const { invoiceId, recipientEmail, senderName, senderEmail } = body as Record<string, unknown>;
  
  if (!isValidUUID(invoiceId)) {
    return { valid: false, error: "Invalid invoice ID format" };
  }
  
  if (!isValidEmail(recipientEmail)) {
    return { valid: false, error: "Invalid recipient email format" };
  }
  
  if (senderName !== undefined && !isValidString(senderName, 100)) {
    return { valid: false, error: "Invalid sender name" };
  }
  
  if (senderEmail !== undefined && senderEmail !== "" && !isValidEmail(senderEmail)) {
    return { valid: false, error: "Invalid sender email format" };
  }
  
  return { 
    valid: true, 
    data: { 
      invoiceId, 
      recipientEmail, 
      senderName: senderName as string | undefined, 
      senderEmail: senderEmail as string | undefined 
    } 
  };
}

// HTML escape function to prevent XSS attacks
function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const formatCurrency = (amount: number, currency: string = "GBP") => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const generateEmailHtml = (invoice: any, senderName: string) => {
  const safeInvoiceNumber = escapeHtml(invoice.invoice_number);
  const safeClientName = escapeHtml(invoice.client_name);
  const safeSenderName = escapeHtml(senderName);
  const safeNotes = escapeHtml(invoice.notes);
  
  const items = (invoice.items as InvoiceItem[]) || [];
  const itemsHtml = items.length > 0
    ? items.map((item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.description)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.rate, invoice.currency)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.amount, invoice.currency)}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="4" style="padding: 12px; text-align: center;">Service fee</td></tr>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Invoice</h1>
            <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 16px;">${safeInvoiceNumber}</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
              Dear ${safeClientName},
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 32px 0;">
              Please find attached your invoice from ${safeSenderName}. We appreciate your business!
            </p>
            
            <!-- Invoice Details -->
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                <div>
                  <p style="color: #6b7280; font-size: 12px; margin: 0; text-transform: uppercase;">Invoice Date</p>
                  <p style="color: #111827; font-size: 14px; margin: 4px 0 0 0; font-weight: 500;">${formatDate(invoice.created_at)}</p>
                </div>
                <div style="text-align: right;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0; text-transform: uppercase;">Due Date</p>
                  <p style="color: #111827; font-size: 14px; margin: 4px 0 0 0; font-weight: 500;">${formatDate(invoice.due_date)}</p>
                </div>
              </div>
            </div>
            
            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Description</th>
                  <th style="padding: 12px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase;">Qty</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase;">Rate</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <!-- Total -->
            <div style="text-align: right; padding: 16px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 8px;">
              <p style="color: #94a3b8; font-size: 14px; margin: 0;">Total Amount Due</p>
              <p style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 8px 0 0 0;">${formatCurrency(invoice.amount, invoice.currency)}</p>
            </div>
            
            ${invoice.notes ? `
              <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px;">
                <p style="color: #92400e; font-size: 14px; margin: 0;"><strong>Notes:</strong> ${safeNotes}</p>
              </div>
            ` : ""}
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Thank you for your business!
            </p>
            <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0 0;">
              This invoice was sent via Left Brain
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
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
  replyTo: string | undefined,
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
  
  if (replyTo) {
    params.append('ReplyToAddresses.member.1', replyTo);
  }

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

Deno.serve(async (req) => {
  console.log("Send invoice function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessKeyId = Deno.env.get('AWS_SES_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SES_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_SES_REGION') || 'eu-west-1';

    if (!accessKeyId || !secretAccessKey) {
      console.error("AWS SES credentials not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error: authentication failed");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const validation = validateInvoiceRequest(requestBody);
    if (!validation.valid) {
      console.error("Validation error:", validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { invoiceId, recipientEmail, senderName, senderEmail } = validation.data;
    console.log("Sending invoice:", invoiceId, "to:", recipientEmail);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice fetch error: unable to retrieve invoice");
      return new Response(
        JSON.stringify({ error: "Unable to process request" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const fromName = senderName || profile?.business_name || profile?.full_name || "Left Brain";
    // Use the SES verified sender address - in future this will be configurable per domain
    const fromAddress = `${fromName} <info@worldmusicmethod.com>`;
    const replyToAddress = senderEmail || user.email;

    const emailHtml = generateEmailHtml(invoice, fromName);
    const subject = `Invoice ${invoice.invoice_number} from ${fromName}`;

    console.log(`Sending invoice email to ${recipientEmail} from ${fromAddress}`);

    const result = await sendEmailViaSES(
      [recipientEmail],
      subject,
      emailHtml,
      fromAddress,
      replyToAddress,
      accessKeyId,
      secretAccessKey,
      region
    );

    if (!result.success) {
      console.error("Failed to send invoice email:", result.error);
      return new Response(
        JSON.stringify({ error: "Email delivery failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Invoice email sent successfully, MessageId:", result.messageId);

    // Update invoice sent_at timestamp
    await supabase
      .from("invoices")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", invoiceId);

    // Log the email
    await supabase.from("email_logs").insert({
      user_id: user.id,
      event_id: invoice.event_id,
      recipient_email: recipientEmail,
      subject: subject,
      template_type: "invoice",
      status: "sent",
    });

    return new Response(
      JSON.stringify({ success: true, message: "Invoice sent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-invoice function: operation failed", error);
    return new Response(
      JSON.stringify({ error: "Operation failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
