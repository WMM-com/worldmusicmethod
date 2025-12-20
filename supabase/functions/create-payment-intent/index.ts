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
    const { productId, email, fullName, couponCode } = await req.json();
    
    console.log("[CREATE-PAYMENT-INTENT] Starting", { productId, email, fullName, couponCode });

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

    console.log("[CREATE-PAYMENT-INTENT] Product found", { name: product.name, price: product.base_price_usd });

    // Calculate price - use sale price if available and valid
    let basePrice = product.base_price_usd;
    if (product.sale_price_usd && (!product.sale_ends_at || new Date(product.sale_ends_at) > new Date())) {
      basePrice = product.sale_price_usd;
    }

    // Apply 1% discount for card payments (Stripe incentive)
    const stripeDiscount = basePrice * 0.01;
    const finalPrice = basePrice - stripeDiscount;
    const amountInCents = Math.round(finalPrice * 100);

    console.log("[CREATE-PAYMENT-INTENT] Price calculated", { basePrice, stripeDiscount, finalPrice, amountInCents });

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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      customer: customerId,
      metadata: {
        product_id: productId,
        product_name: product.name,
        product_type: product.product_type,
        course_id: product.course_id || "",
        email,
        full_name: fullName,
        coupon_code: couponCode || "",
        stripe_discount: stripeDiscount.toFixed(2),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log("[CREATE-PAYMENT-INTENT] Payment intent created", { 
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ? "present" : "missing" 
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: finalPrice,
        originalAmount: basePrice,
        discount: stripeDiscount,
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
