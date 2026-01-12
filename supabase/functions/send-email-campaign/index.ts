import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-CAMPAIGN] ${step}${detailsStr}`);
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

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): Promise<boolean> {
  const url = new URL(`https://email.${region}.amazonaws.com/`);
  const from = 'World Music Method <noreply@worldmusicmethod.com>';
  
  const params = new URLSearchParams();
  params.append('Action', 'SendEmail');
  params.append('Version', '2010-12-01');
  params.append('Source', from);
  params.append('Destination.ToAddresses.member.1', to);
  params.append('Message.Subject.Data', subject);
  params.append('Message.Subject.Charset', 'UTF-8');
  params.append('Message.Body.Html.Data', html);
  params.append('Message.Body.Html.Charset', 'UTF-8');

  const body = params.toString();
  const headers = await signRequest('POST', url, body, accessKeyId, secretAccessKey, region, 'ses');

  try {
    const response = await fetch(url.toString(), { method: 'POST', headers, body });
    if (!response.ok) {
      const text = await response.text();
      logStep("SES error response", { status: response.status, text });
    }
    return response.ok;
  } catch (err) {
    logStep("Send error", { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const accessKeyId = Deno.env.get("AWS_SES_ACCESS_KEY_ID") || "";
    const secretAccessKey = Deno.env.get("AWS_SES_SECRET_ACCESS_KEY") || "";
    const region = Deno.env.get("AWS_SES_REGION") || "eu-west-2";

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("AWS SES credentials not configured");
    }

    const { campaignId, previewOnly } = await req.json();
    logStep("Campaign ID", { campaignId, previewOnly });

    if (!campaignId) {
      throw new Error("campaignId is required");
    }

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    logStep("Campaign fetched", { name: campaign.name, status: campaign.status });

    // Build recipient list
    let recipients: { email: string; first_name: string | null }[] = [];

    // Get contacts from lists
    if (campaign.send_to_lists && campaign.send_to_lists.length > 0) {
      const { data: listMembers } = await supabase
        .from("email_list_members")
        .select("contact:email_contacts(id, email, first_name, is_subscribed)")
        .in("list_id", campaign.send_to_lists);

      if (listMembers) {
        for (const member of listMembers) {
          const contact = member.contact as any;
          if (contact && contact.is_subscribed) {
            recipients.push({ email: contact.email, first_name: contact.first_name });
          }
        }
      }
      logStep("List recipients", { count: recipients.length });
    }

    // Get contacts with include tags - now properly checking both user_tags and profiles
    if (campaign.include_tags && campaign.include_tags.length > 0) {
      // Get emails from user_tags
      const { data: taggedUsers } = await supabase
        .from("user_tags")
        .select("email, user_id")
        .in("tag_id", campaign.include_tags);

      logStep("Tagged users found", { count: taggedUsers?.length || 0 });

      if (taggedUsers) {
        for (const tagged of taggedUsers) {
          // Check if unsubscribed in email_contacts
          const { data: contact } = await supabase
            .from("email_contacts")
            .select("is_subscribed")
            .eq("email", tagged.email)
            .maybeSingle();

          // If contact exists and is unsubscribed, skip
          if (contact && !contact.is_subscribed) {
            logStep("Skipping unsubscribed", { email: tagged.email });
            continue;
          }

          // Get name from profile if user_id exists
          let firstName = null;
          if (tagged.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", tagged.user_id)
              .maybeSingle();
            
            if (profile?.full_name) {
              firstName = profile.full_name.split(' ')[0];
            }
          }

          if (tagged.email) {
            recipients.push({ email: tagged.email, first_name: firstName });
          }
        }
      }
    }

    // Remove duplicates
    const uniqueRecipients = Array.from(
      new Map(recipients.map(r => [r.email.toLowerCase(), r])).values()
    );

    // Exclude contacts with exclude tags
    let finalRecipients = uniqueRecipients;
    if (campaign.exclude_tags && campaign.exclude_tags.length > 0) {
      const { data: excludedEmails } = await supabase
        .from("user_tags")
        .select("email")
        .in("tag_id", campaign.exclude_tags);

      const excludeSet = new Set((excludedEmails || []).map(e => e.email?.toLowerCase()).filter(Boolean));
      finalRecipients = uniqueRecipients.filter(r => !excludeSet.has(r.email.toLowerCase()));
    }

    logStep("Recipients calculated", { total: finalRecipients.length });

    // If preview only, just return the count
    if (previewOnly) {
      return new Response(JSON.stringify({ 
        success: true, 
        recipientCount: finalRecipients.length,
        recipients: finalRecipients.slice(0, 10).map(r => r.email) // First 10 for preview
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check campaign is in sendable state
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error("Campaign is not in a sendable state");
    }

    // Update campaign status to sending
    await supabase
      .from("email_campaigns")
      .update({ status: 'sending', total_recipients: finalRecipients.length })
      .eq("id", campaignId);

    let sentCount = 0;

    // Construct the app URL for unsubscribe
    const appUrl = supabaseUrl.replace('.supabase.co', '').replace('https://', 'https://');
    // Use the production URL if available
    const baseUrl = 'https://worldmusicmethod.com';

    // Send emails
    for (const recipient of finalRecipients) {
      try {
        // Create unsubscribe token
        const { data: tokenData } = await supabase
          .from("email_unsubscribe_tokens")
          .insert({ email: recipient.email.toLowerCase() })
          .select('token')
          .single();

        const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${tokenData?.token || ''}&email=${encodeURIComponent(recipient.email)}`;

        // Variable substitution
        let htmlBody = campaign.body_html
          .replace(/\{\{first_name\}\}/g, recipient.first_name || 'there')
          .replace(/\{\{email\}\}/g, recipient.email)
          .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);

        // Add unsubscribe footer if not already in the email
        if (!htmlBody.includes('unsubscribe') && !htmlBody.includes('Unsubscribe')) {
          htmlBody += `
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center;">
              <p>If you no longer wish to receive these emails, you can <a href="${unsubscribeUrl}" style="color: #666;">unsubscribe here</a>.</p>
            </div>
          `;
        }

        const success = await sendEmail(
          recipient.email,
          campaign.subject,
          htmlBody,
          accessKeyId,
          secretAccessKey,
          region
        );

        if (success) {
          sentCount++;
          await supabase.from("email_send_log").insert({
            email: recipient.email,
            subject: campaign.subject,
            status: "sent",
          });
        } else {
          await supabase.from("email_send_log").insert({
            email: recipient.email,
            subject: campaign.subject,
            status: "failed",
          });
        }

        // Small delay to avoid throttling
        if (sentCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (sendError) {
        logStep("Failed to send to recipient", { email: recipient.email, error: sendError instanceof Error ? sendError.message : String(sendError) });
        await supabase.from("email_send_log").insert({
          email: recipient.email,
          subject: campaign.subject,
          status: "failed",
        });
      }
    }

    // Update campaign as sent
    await supabase
      .from("email_campaigns")
      .update({ 
        status: 'sent', 
        sent_at: new Date().toISOString(),
        sent_count: sentCount 
      })
      .eq("id", campaignId);

    logStep("Campaign sent", { sentCount, total: finalRecipients.length });

    return new Response(JSON.stringify({ success: true, sentCount, total: finalRecipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
