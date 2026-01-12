import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SCHEDULED-CAMPAIGNS] ${step}${detailsStr}`);
};

// AWS SES signing (copied from send-email-campaign)
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
  const from = 'World Music Method <info@worldmusicmethod.com>';
  
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
    logStep("Processing scheduled campaigns");

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

    // Find campaigns that are scheduled and due
    const now = new Date().toISOString();
    const { data: dueCampaigns, error: fetchError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled campaigns: ${fetchError.message}`);
    }

    logStep("Found due campaigns", { count: dueCampaigns?.length || 0 });

    const results = [];
    const baseUrl = 'https://wpczgwxsriezaubncuom.lovable.app';

    for (const campaign of dueCampaigns || []) {
      logStep("Sending scheduled campaign", { id: campaign.id, name: campaign.name });

      try {
        // Build recipient list directly (same logic as send-email-campaign)
        let recipients: { email: string; first_name: string | null }[] = [];

        const audience = {
          send_to_all: Boolean(campaign.send_to_all ?? false),
          send_to_lists: (campaign.send_to_lists ?? []) as string[],
          include_tags: (campaign.include_tags ?? []) as string[],
          exclude_tags: (campaign.exclude_tags ?? []) as string[],
        };

        // If send_to_all is true, get all subscribed users from profiles
        if (audience.send_to_all) {
          logStep("Sending to all users");
          const { data: allProfiles } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .not("email", "is", null);

          if (allProfiles) {
            for (const profile of allProfiles) {
              if (!profile.email) continue;

              // Check if unsubscribed in email_contacts
              const { data: contact } = await supabase
                .from("email_contacts")
                .select("is_subscribed")
                .eq("email", profile.email.toLowerCase())
                .maybeSingle();

              if (contact && !contact.is_subscribed) continue;

              const firstName = profile.full_name ? profile.full_name.split(' ')[0] : null;
              recipients.push({ email: profile.email, first_name: firstName });
            }
          }
        }

        // Get contacts from lists
        if (!audience.send_to_all && audience.send_to_lists.length > 0) {
          const { data: listMembers } = await supabase
            .from("email_list_members")
            .select("contact:email_contacts(id, email, first_name, is_subscribed)")
            .in("list_id", audience.send_to_lists);

          if (listMembers) {
            for (const member of listMembers) {
              const contact = member.contact as any;
              if (contact && contact.is_subscribed) {
                recipients.push({ email: contact.email, first_name: contact.first_name });
              }
            }
          }
        }

        // Get contacts with include tags
        if (!audience.send_to_all && audience.include_tags.length > 0) {
          const { data: taggedUsers } = await supabase
            .from("user_tags")
            .select("email, user_id")
            .in("tag_id", audience.include_tags);

          if (taggedUsers) {
            for (const tagged of taggedUsers) {
              if (!tagged.email) continue;

              const { data: contact } = await supabase
                .from("email_contacts")
                .select("is_subscribed")
                .eq("email", tagged.email.toLowerCase())
                .maybeSingle();

              if (contact && !contact.is_subscribed) continue;

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

              recipients.push({ email: tagged.email, first_name: firstName });
            }
          }
        }

        // Remove duplicates
        const uniqueRecipients = Array.from(
          new Map(recipients.map(r => [r.email.toLowerCase(), r])).values()
        );

        // Exclude contacts with exclude tags
        let finalRecipients = uniqueRecipients;
        if (audience.exclude_tags.length > 0) {
          const { data: excludedEmails } = await supabase
            .from("user_tags")
            .select("email")
            .in("tag_id", audience.exclude_tags);

          const excludeSet = new Set((excludedEmails || []).map(e => e.email?.toLowerCase()).filter(Boolean));
          finalRecipients = uniqueRecipients.filter(r => !excludeSet.has(r.email.toLowerCase()));
        }

        logStep("Recipients calculated", { campaignId: campaign.id, count: finalRecipients.length });

        // Update campaign status to sending
        await supabase
          .from("email_campaigns")
          .update({ status: 'sending', total_recipients: finalRecipients.length })
          .eq("id", campaign.id);

        let sentCount = 0;

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

            // Rate limiting: 14 emails per second
            await new Promise(resolve => setTimeout(resolve, 72));

            // Update progress periodically
            if (sentCount % 100 === 0) {
              await supabase
                .from("email_campaigns")
                .update({ sent_count: sentCount })
                .eq("id", campaign.id);
              logStep("Progress update", { campaignId: campaign.id, sent: sentCount, total: finalRecipients.length });
            }
          } catch (sendError) {
            logStep("Failed to send to recipient", { email: recipient.email, error: sendError instanceof Error ? sendError.message : String(sendError) });
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
          .eq("id", campaign.id);

        logStep("Campaign sent", { id: campaign.id, sentCount, total: finalRecipients.length });
        results.push({ id: campaign.id, success: true, sentCount });
      } catch (campaignError) {
        logStep("Failed to send campaign", { id: campaign.id, error: campaignError instanceof Error ? campaignError.message : String(campaignError) });
        
        // Mark campaign as failed/draft so it can be retried
        await supabase
          .from("email_campaigns")
          .update({ status: 'draft' })
          .eq("id", campaign.id);
          
        results.push({ id: campaign.id, success: false, error: campaignError instanceof Error ? campaignError.message : String(campaignError) });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), {
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
