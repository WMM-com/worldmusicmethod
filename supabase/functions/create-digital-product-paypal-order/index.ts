import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_SECRET");
  
  if (!clientId || !clientSecret) {
    throw new Error("PayPal not configured");
  }
  
  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("[PAYPAL] Token error:", data);
    throw new Error("Failed to get PayPal access token");
  }
  
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, sellerId, amount, currency, returnUrl, cancelUrl } = await req.json();
    
    console.log("[create-digital-product-paypal-order] Starting", { productId, sellerId, amount, currency });

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

    console.log("[create-digital-product-paypal-order] Product found:", product.title);

    // Get seller's PayPal email
    const { data: paymentAccount, error: accountError } = await supabaseClient
      .from("payment_accounts")
      .select("account_email, metadata")
      .eq("user_id", sellerId)
      .eq("provider", "paypal")
      .eq("onboarding_complete", true)
      .single();

    if (accountError || !paymentAccount?.account_email) {
      throw new Error("Seller has no PayPal account connected");
    }

    const sellerPaypalEmail = paymentAccount.account_email;
    console.log("[create-digital-product-paypal-order] Seller PayPal:", sellerPaypalEmail);

    // Calculate platform fee (10%)
    const platformFeePercent = 10;
    const platformFee = amount * (platformFeePercent / 100);
    const sellerAmount = amount - platformFee;

    const formattedPrice = amount.toFixed(2);
    const paymentCurrency = currency.toUpperCase();

    const accessToken = await getPayPalAccessToken();

    // Create PayPal order
    // Note: For split payments, you'd need PayPal Commerce Platform
    // This is a simple order that pays the seller directly
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: productId,
          description: product.title.substring(0, 127),
          custom_id: JSON.stringify({
            product_id: productId,
            seller_id: sellerId,
            buyer_id: buyerId || "",
            product_type: "digital_product",
          }).substring(0, 127),
          amount: {
            currency_code: paymentCurrency,
            value: formattedPrice,
          },
          payee: {
            email_address: sellerPaypalEmail,
          },
        },
      ],
      application_context: {
        brand_name: "World Music Method",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    };

    const response = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const order = await response.json();

    if (!response.ok) {
      console.error("[create-digital-product-paypal-order] Error:", order);
      throw new Error(order.message || "Failed to create PayPal order");
    }

    console.log("[create-digital-product-paypal-order] Order created:", order.id);

    const approveUrl = order.links?.find((link: any) => link.rel === "approve")?.href;

    return new Response(
      JSON.stringify({
        orderId: order.id,
        approveUrl,
        amount,
        currency: paymentCurrency,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[create-digital-product-paypal-order] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
