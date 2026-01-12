import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UNSUBSCRIBE] ${step}${detailsStr}`);
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

    const { email, token, reason, action } = await req.json();
    logStep("Request received", { email, action, hasToken: !!token });

    if (!email) {
      throw new Error("Email is required");
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (action === 'resubscribe') {
      // Resubscribe the user
      const { error } = await supabase
        .from('email_contacts')
        .update({ 
          is_subscribed: true, 
          unsubscribed_at: null,
          unsubscribe_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('email', normalizedEmail);

      if (error) {
        logStep("Resubscribe error", { error: error.message });
        throw error;
      }

      logStep("User resubscribed", { email: normalizedEmail });
      return new Response(JSON.stringify({ success: true, action: 'resubscribed' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Unsubscribe action
    // If token provided, mark it as used
    if (token) {
      await supabase
        .from('email_unsubscribe_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);
    }

    // Check if contact exists
    const { data: existingContact } = await supabase
      .from('email_contacts')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingContact) {
      // Update existing contact
      const { error } = await supabase
        .from('email_contacts')
        .update({ 
          is_subscribed: false, 
          unsubscribed_at: new Date().toISOString(),
          unsubscribe_reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('email', normalizedEmail);

      if (error) {
        logStep("Unsubscribe update error", { error: error.message });
        throw error;
      }
    } else {
      // Create a new unsubscribed contact record
      const { error } = await supabase
        .from('email_contacts')
        .insert({
          email: normalizedEmail,
          is_subscribed: false,
          unsubscribed_at: new Date().toISOString(),
          unsubscribe_reason: reason || null,
          source: 'unsubscribe'
        });

      if (error) {
        logStep("Create unsubscribed contact error", { error: error.message });
        throw error;
      }
    }

    logStep("User unsubscribed", { email: normalizedEmail, reason });

    return new Response(JSON.stringify({ success: true, action: 'unsubscribed' }), {
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
