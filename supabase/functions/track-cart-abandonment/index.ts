import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRACK-CART-ABANDONMENT] ${step}${detailsStr}`);
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

    const { userId, email, cartItems, cartTotal, currency } = await req.json();
    logStep("Request body", { userId, email, itemCount: cartItems?.length, cartTotal });

    if (!cartItems || cartItems.length === 0) {
      throw new Error("cartItems is required");
    }

    if (!userId && !email) {
      throw new Error("Either userId or email is required");
    }

    // Check for existing active abandonment with same items
    const existingQuery = supabase
      .from("cart_abandonment")
      .select("id, cart_items, recovered_at")
      .is("recovered_at", null);

    if (userId) {
      existingQuery.eq("user_id", userId);
    } else if (email) {
      existingQuery.eq("email", email.toLowerCase());
    }

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      // Update existing abandonment
      const { error: updateError } = await supabase
        .from("cart_abandonment")
        .update({
          cart_items: cartItems,
          cart_total: cartTotal,
          currency: currency || "USD",
          abandoned_at: new Date().toISOString(),
          recovery_email_sent: false, // Reset so new items trigger email
        })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(`Failed to update cart abandonment: ${updateError.message}`);
      }

      logStep("Updated existing cart abandonment", { id: existing.id });
      return new Response(JSON.stringify({ success: true, updated: true, id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new abandonment record
    const { data: newRecord, error: insertError } = await supabase
      .from("cart_abandonment")
      .insert({
        user_id: userId || null,
        email: email?.toLowerCase() || null,
        cart_items: cartItems,
        cart_total: cartTotal,
        currency: currency || "USD",
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Failed to create cart abandonment: ${insertError.message}`);
    }

    logStep("Created new cart abandonment", { id: newRecord.id });

    return new Response(JSON.stringify({ success: true, created: true, id: newRecord.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
