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
    const { productId, productIds, email, fullName, couponCode, returnUrl, cancelUrl, currency, amounts, amount } = await req.json();
    
    // Support both single productId (legacy) and multiple productIds
    const productIdList = productIds || (productId ? [productId] : []);
    const amountList = amounts || [];
    
    console.log("[CREATE-PAYPAL-ORDER] Starting", { productIds: productIdList, email, fullName, currency, couponCode, amount });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (productIdList.length === 0) {
      throw new Error("No products provided");
    }

    // Get all product details
    const { data: products, error: productsError } = await supabaseClient
      .from("products")
      .select("*")
      .in("id", productIdList);

    if (productsError || !products || products.length === 0) {
      throw new Error("Products not found");
    }

    console.log("[CREATE-PAYPAL-ORDER] Products found", { count: products.length });

    // Use geo-priced currency or default to USD
    const paymentCurrency = (currency || 'USD').toUpperCase();
    
    // If amount is passed directly from frontend (already includes coupon discount), use it
    // Otherwise calculate from amountList or product prices
    let totalAmount = 0;
    let originalAmount = 0;
    const itemDetails: { product_id: string; name: string; course_id: string | null; amount: number }[] = [];
    
    for (let i = 0; i < productIdList.length; i++) {
      const product = products.find(p => p.id === productIdList[i]);
      if (product) {
        // Use geo-priced amount if provided, otherwise use product price
        let productAmount = amountList[i];
        if (!productAmount) {
          // Calculate from product
          productAmount = product.base_price_usd;
          if (product.sale_price_usd && (!product.sale_ends_at || new Date(product.sale_ends_at) > new Date())) {
            productAmount = product.sale_price_usd;
          }
        }
        originalAmount += productAmount;
        itemDetails.push({
          product_id: product.id,
          name: product.name,
          course_id: product.course_id || null,
          amount: productAmount,
        });
      }
    }

    // Use the discounted amount from frontend if provided, otherwise use calculated total
    totalAmount = (typeof amount === 'number' && amount > 0) ? amount : originalAmount;
    const couponDiscount = originalAmount - totalAmount;

    const formattedPrice = totalAmount.toFixed(2);

    console.log("[CREATE-PAYPAL-ORDER] Price calculated", { 
      totalAmount: formattedPrice, 
      originalAmount, 
      couponDiscount, 
      currency: paymentCurrency,
      couponCode 
    });

    // Store order metadata in pending orders table (PayPal custom_id has 127 char limit)
    const { data: pendingOrder, error: pendingError } = await supabaseClient
      .from("paypal_pending_orders")
      .insert({
        product_ids: productIdList,
        product_details: itemDetails,
        email,
        full_name: fullName,
        coupon_code: couponCode || null,
        currency: paymentCurrency,
        total_amount: totalAmount,
        original_amount: originalAmount,
        coupon_discount: couponDiscount,
      })
      .select()
      .single();

    if (pendingError || !pendingOrder) {
      console.error("[CREATE-PAYPAL-ORDER] Failed to create pending order:", pendingError);
      throw new Error("Failed to prepare order");
    }

    console.log("[CREATE-PAYPAL-ORDER] Pending order created", { pendingOrderId: pendingOrder.id });

    const accessToken = await getPayPalAccessToken();

    // Build item descriptions for multiple products
    const productNames = products.map(p => p.name).join(', ');

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: pendingOrder.id,
          description: productNames.length > 127 ? productNames.substring(0, 124) + '...' : productNames,
          custom_id: pendingOrder.id, // Just the UUID - stays under 127 chars
          amount: {
            currency_code: paymentCurrency,
            value: formattedPrice,
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
      console.error("[CREATE-PAYPAL-ORDER] Error:", order);
      throw new Error(order.message || "Failed to create PayPal order");
    }

    console.log("[CREATE-PAYPAL-ORDER] Order created", { orderId: order.id });

    const approveUrl = order.links?.find((link: any) => link.rel === "approve")?.href;

    return new Response(
      JSON.stringify({
        orderId: order.id,
        approveUrl,
        amount: totalAmount,
        currency: paymentCurrency,
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