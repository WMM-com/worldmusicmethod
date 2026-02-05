import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, sellerId, amount, currency, successUrl, cancelUrl } = await req.json();
    
    console.log("[create-digital-product-stripe-checkout] Starting", { productId, sellerId, amount, currency });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get buyer info from auth header if present
    const authHeader = req.headers.get("Authorization");
    let buyerEmail: string | undefined;
    let buyerId: string | undefined;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      buyerEmail = userData.user?.email ?? undefined;
      buyerId = userData.user?.id;
    }

    // Get digital product
    const { data: product, error: productError } = await supabaseClient
      .from("digital_products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      throw new Error("Product not found");
    }

    console.log("[create-digital-product-stripe-checkout] Product found:", product.title);

    // Get seller's Stripe Connect account
    const { data: paymentAccount, error: accountError } = await supabaseClient
      .from("payment_accounts")
      .select("account_id, metadata")
      .eq("user_id", sellerId)
      .eq("provider", "stripe")
      .eq("onboarding_complete", true)
      .single();

    if (accountError || !paymentAccount?.account_id) {
      throw new Error("Seller has no Stripe account connected");
    }

    const stripeConnectAccountId = paymentAccount.account_id;
    console.log("[create-digital-product-stripe-checkout] Seller Stripe account:", stripeConnectAccountId);

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe not configured");
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    // Calculate platform fee (10%)
    const platformFeePercent = 10;
    const amountInCents = Math.round(amount * 100);
    const platformFee = Math.round(amountInCents * (platformFeePercent / 100));

    // Create checkout session with Connect
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: buyerEmail,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: product.title,
              description: product.description || undefined,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: stripeConnectAccountId,
        },
        metadata: {
          product_id: productId,
          seller_id: sellerId,
          buyer_id: buyerId || "",
          product_type: "digital_product",
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_id: productId,
        seller_id: sellerId,
        buyer_id: buyerId || "",
        product_type: "digital_product",
      },
    });

    console.log("[create-digital-product-stripe-checkout] Session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[create-digital-product-stripe-checkout] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
