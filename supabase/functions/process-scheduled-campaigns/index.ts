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

    for (const campaign of dueCampaigns || []) {
      logStep("Sending scheduled campaign", { id: campaign.id, name: campaign.name });

      // Invoke the send-email-campaign function
      const { data, error } = await supabase.functions.invoke("send-email-campaign", {
        body: { campaignId: campaign.id }
      });

      if (error) {
        logStep("Failed to send campaign", { id: campaign.id, error: error.message });
        results.push({ id: campaign.id, success: false, error: error.message });
      } else {
        logStep("Campaign sent", { id: campaign.id, sentCount: data?.sentCount });
        results.push({ id: campaign.id, success: true, sentCount: data?.sentCount });
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
