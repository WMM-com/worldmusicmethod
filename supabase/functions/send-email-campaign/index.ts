import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SESClient, SendEmailCommand } from "npm:@aws-sdk/client-ses@3.540.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-CAMPAIGN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { campaignId } = await req.json();
    logStep("Campaign ID", { campaignId });

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

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error("Campaign is not in a sendable state");
    }

    logStep("Campaign fetched", { name: campaign.name, status: campaign.status });

    // Update campaign status to sending
    await supabase
      .from("email_campaigns")
      .update({ status: 'sending' })
      .eq("id", campaignId);

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
    }

    // Get contacts with include tags
    if (campaign.include_tags && campaign.include_tags.length > 0) {
      const { data: taggedContacts } = await supabase
        .from("user_tags")
        .select("email")
        .in("tag_id", campaign.include_tags);

      if (taggedContacts) {
        for (const tagged of taggedContacts) {
          const { data: contact } = await supabase
            .from("email_contacts")
            .select("email, first_name, is_subscribed")
            .eq("email", tagged.email)
            .eq("is_subscribed", true)
            .maybeSingle();

          if (contact) {
            recipients.push({ email: contact.email, first_name: contact.first_name });
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

      const excludeSet = new Set((excludedEmails || []).map(e => e.email.toLowerCase()));
      finalRecipients = uniqueRecipients.filter(r => !excludeSet.has(r.email.toLowerCase()));
    }

    logStep("Recipients calculated", { total: finalRecipients.length });

    // Update total recipients
    await supabase
      .from("email_campaigns")
      .update({ total_recipients: finalRecipients.length })
      .eq("id", campaignId);

    // Initialize SES client
    const sesClient = new SESClient({
      region: Deno.env.get("AWS_SES_REGION") || "eu-west-2",
      credentials: {
        accessKeyId: Deno.env.get("AWS_SES_ACCESS_KEY_ID") || "",
        secretAccessKey: Deno.env.get("AWS_SES_SECRET_ACCESS_KEY") || "",
      },
    });

    let sentCount = 0;
    const fromEmail = "noreply@worldmusicmethod.com";

    // Send emails
    for (const recipient of finalRecipients) {
      try {
        // Variable substitution
        let htmlBody = campaign.body_html
          .replace(/\{\{first_name\}\}/g, recipient.first_name || 'there')
          .replace(/\{\{email\}\}/g, recipient.email);

        const command = new SendEmailCommand({
          Source: fromEmail,
          Destination: { ToAddresses: [recipient.email] },
          Message: {
            Subject: { Data: campaign.subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: htmlBody, Charset: "UTF-8" },
              Text: { Data: campaign.body_text || htmlBody.replace(/<[^>]*>/g, ''), Charset: "UTF-8" },
            },
          },
        });

        await sesClient.send(command);
        sentCount++;

        // Log send
        await supabase.from("email_send_log").insert({
          email: recipient.email,
          subject: campaign.subject,
          status: "sent",
        });

        // Small delay to avoid throttling
        if (sentCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (sendError) {
        logStep("Failed to send to recipient", { email: recipient.email, error: sendError.message });
        await supabase.from("email_send_log").insert({
          email: recipient.email,
          subject: campaign.subject,
          status: "failed",
          error_message: sendError.message,
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

    return new Response(JSON.stringify({ success: true, sentCount }), {
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
