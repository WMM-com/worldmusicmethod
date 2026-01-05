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
    const { productIds, email, fullName, couponCode, currency, amounts } = await req.json();
    
    // Support both single productId (legacy) and multiple productIds
    const productIdList = productIds || [];
    const amountList = amounts || [];
    
    console.log("[CREATE-PAYMENT-INTENT] Starting", { productIds: productIdList, email, fullName, couponCode, currency, amounts: amountList });

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

    console.log("[CREATE-PAYMENT-INTENT] Products found", { count: products.length });

    // Use the currency passed from frontend (geo-priced) or default to USD
    const paymentCurrency = (currency || 'USD').toLowerCase();
    
    // Calculate total amount from the amounts passed by frontend (already geo-priced AND coupon-discounted)
    let totalAmount = 0;
    let originalAmount = 0;
    const productDetails: { id: string; name: string; course_id: string | null; amount: number }[] = [];
    
    for (let i = 0; i < productIdList.length; i++) {
      const product = products.find(p => p.id === productIdList[i]);
      if (product) {
        // Use the pre-calculated amount from frontend (includes geo-pricing AND coupon discount)
        const productAmount = amountList[i] || product.base_price_usd;
        totalAmount += productAmount;
        // Track original for discount calculation
        originalAmount += product.base_price_usd;
        productDetails.push({
          id: product.id,
          name: product.name,
          course_id: product.course_id,
          amount: productAmount,
        });
      }
    }

    // Calculate coupon discount (difference between original and passed amount)
    const couponDiscount = originalAmount > totalAmount ? originalAmount - totalAmount : 0;

    // Apply 2% discount for card payments (Stripe incentive)
    const stripeDiscount = totalAmount * 0.02;
    const finalPrice = totalAmount - stripeDiscount;
    const amountInCents = Math.round(finalPrice * 100);

    console.log("[CREATE-PAYMENT-INTENT] Price calculated", { 
      totalAmount, 
      originalAmount,
      couponDiscount,
      couponCode,
      stripeDiscount, 
      finalPrice, 
      amountInCents, 
      currency: paymentCurrency 
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer or create new one
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-PAYMENT-INTENT] Existing customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email,
        name: fullName,
      });
      customerId = customer.id;
      console.log("[CREATE-PAYMENT-INTENT] New customer created", { customerId });
    }

    // Create payment intent with the correct currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: paymentCurrency,
      customer: customerId,
      payment_method_types: ["card"],
      metadata: {
        // Store all product IDs as JSON array for multi-product support
        product_ids: JSON.stringify(productIdList),
        product_details: JSON.stringify(productDetails),
        email,
        full_name: fullName,
        coupon_code: couponCode || "",
        coupon_discount: couponDiscount.toFixed(2),
        stripe_discount: stripeDiscount.toFixed(2),
        currency: paymentCurrency.toUpperCase(),
        original_amount: originalAmount.toFixed(2),
        final_amount: finalPrice.toFixed(2),
      },
    });

    console.log("[CREATE-PAYMENT-INTENT] Payment intent created", { 
      paymentIntentId: paymentIntent.id,
      currency: paymentCurrency,
      clientSecret: paymentIntent.client_secret ? "present" : "missing" 
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: finalPrice,
        originalAmount: totalAmount,
        discount: stripeDiscount,
        currency: paymentCurrency.toUpperCase(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-PAYMENT-INTENT] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
