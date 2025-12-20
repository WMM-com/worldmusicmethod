import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_SECRET");
  
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
    const { productId, email, fullName, couponCode, returnUrl, cancelUrl } = await req.json();
    
    console.log("[CREATE-PAYPAL-ORDER] Starting", { productId, email, fullName });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get product details
    const { data: product, error: productError } = await supabaseClient
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      throw new Error("Product not found");
    }

    console.log("[CREATE-PAYPAL-ORDER] Product found", { name: product.name, price: product.base_price_usd });

    // Calculate price - use sale price if available and valid
    let finalPrice = product.base_price_usd;
    if (product.sale_price_usd && (!product.sale_ends_at || new Date(product.sale_ends_at) > new Date())) {
      finalPrice = product.sale_price_usd;
    }

    // No discount for PayPal (incentivize Stripe)
    const formattedPrice = finalPrice.toFixed(2);

    console.log("[CREATE-PAYPAL-ORDER] Price calculated", { finalPrice: formattedPrice });

    const accessToken = await getPayPalAccessToken();

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: productId,
          description: product.name,
          custom_id: JSON.stringify({
            product_id: productId,
            product_type: product.product_type,
            course_id: product.course_id || null,
            email,
            full_name: fullName,
            coupon_code: couponCode || null,
          }),
          amount: {
            currency_code: "USD",
            value: formattedPrice,
          },
        },
      ],
      application_context: {
        brand_name: "Pickup Music",
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
      console.error("[CREATE-PAYPAL-ORDER] Error:", order);
      throw new Error(order.message || "Failed to create PayPal order");
    }

    console.log("[CREATE-PAYPAL-ORDER] Order created", { orderId: order.id });

    const approveUrl = order.links?.find((link: any) => link.rel === "approve")?.href;

    return new Response(
      JSON.stringify({
        orderId: order.id,
        approveUrl,
        amount: finalPrice,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-PAYPAL-ORDER] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
