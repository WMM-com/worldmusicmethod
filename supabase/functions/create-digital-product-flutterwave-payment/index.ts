import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { productId, sellerId, amount, currency, redirectUrl } = await req.json();
    
    console.log("[create-digital-product-flutterwave-payment] Starting", { productId, sellerId, amount, currency });

    const flutterwaveSecretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!flutterwaveSecretKey) {
      throw new Error("Flutterwave not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get buyer info from auth header if present
    const authHeader = req.headers.get("Authorization");
    let buyerEmail = "buyer@example.com";
    let buyerName = "Customer";
    let buyerId: string | undefined;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData.user?.email) {
        buyerEmail = userData.user.email;
        buyerId = userData.user.id;
      }
      
      // Get profile for name
      if (userData.user?.id) {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("full_name")
          .eq("id", userData.user.id)
          .single();
        if (profile?.full_name) {
          buyerName = profile.full_name;
        }
      }
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

    console.log("[create-digital-product-flutterwave-payment] Product found:", product.title);

    // Get seller's Flutterwave subaccount
    const { data: paymentAccount, error: accountError } = await supabaseClient
      .from("payment_accounts")
      .select("account_id, metadata")
      .eq("user_id", sellerId)
      .eq("provider", "flutterwave")
      .eq("onboarding_complete", true)
      .single();

    if (accountError || !paymentAccount?.account_id) {
      throw new Error("Seller has no Flutterwave account connected");
    }

    const subaccountId = paymentAccount.account_id;
    console.log("[create-digital-product-flutterwave-payment] Seller subaccount:", subaccountId);

    // Generate unique transaction reference
    const txRef = `dp_${productId.slice(0, 8)}_${Date.now()}`;

    // Create Flutterwave payment link
    const paymentPayload = {
      tx_ref: txRef,
      amount: amount,
      currency: currency.toUpperCase(),
      redirect_url: redirectUrl,
      customer: {
        email: buyerEmail,
        name: buyerName,
      },
      customizations: {
        title: product.title,
        description: product.description || `Purchase of ${product.title}`,
      },
      subaccounts: [
        {
          id: subaccountId,
        },
      ],
      meta: {
        product_id: productId,
        seller_id: sellerId,
        buyer_id: buyerId || "",
        product_type: "digital_product",
      },
    };

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${flutterwaveSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentPayload),
    });

    const data = await response.json();

    if (data.status !== "success") {
      console.error("[create-digital-product-flutterwave-payment] Error:", data);
      throw new Error(data.message || "Failed to create Flutterwave payment");
    }

    console.log("[create-digital-product-flutterwave-payment] Payment link created:", data.data.link);

    return new Response(
      JSON.stringify({ 
        url: data.data.link, 
        txRef,
        amount,
        currency,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[create-digital-product-flutterwave-payment] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
