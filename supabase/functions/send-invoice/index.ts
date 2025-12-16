import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sendGridApiKey = Deno.env.get("SENDGRID_API_KEY");
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
  const items = (invoice.items as InvoiceItem[]) || [];
  const itemsHtml = items.length > 0
    ? items.map((item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
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
            <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 16px;">${invoice.invoice_number}</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
              Dear ${invoice.client_name},
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 32px 0;">
              Please find attached your invoice from ${senderName}. We appreciate your business!
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
                <p style="color: #92400e; font-size: 14px; margin: 0;"><strong>Notes:</strong> ${invoice.notes}</p>
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

const handler = async (req: Request): Promise<Response> => {
  console.log("Send invoice function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!sendGridApiKey) {
      console.error("SENDGRID_API_KEY not configured");
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
    
    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
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

    // Fetch the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice fetch error:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Unable to process request" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile for sender details
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const fromName = senderName || profile?.business_name || profile?.full_name || "Left Brain";
    const fromEmail = senderEmail || "noreply@leftbrain.app";

    const emailHtml = generateEmailHtml(invoice, fromName);

    // Send email via SendGrid
    const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sendGridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: recipientEmail }],
            subject: `Invoice ${invoice.invoice_number} from ${fromName}`,
          },
        ],
        from: {
          email: fromEmail,
          name: fromName,
        },
        content: [
          {
            type: "text/html",
            value: emailHtml,
          },
        ],
      }),
    });

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error("SendGrid error:", sendGridResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Email delivery failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully");

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
      subject: `Invoice ${invoice.invoice_number} from ${fromName}`,
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
  } catch (error: any) {
    console.error("Error in send-invoice function:", error);
    return new Response(
      JSON.stringify({ error: "Operation failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
