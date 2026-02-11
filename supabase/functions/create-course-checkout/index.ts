import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-COURSE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { productId, courseId, region, priceAmount, currency, couponCode } = await req.json();
    logStep("Request body parsed", { productId, courseId, region, priceAmount, currency, couponCode });

    if (!productId || !priceAmount) {
      throw new Error("Missing required fields: productId and priceAmount");
    }

    // Fetch product details
    const { data: product, error: productError } = await supabaseClient
      .from("products")
      .select("name, description")
      .eq("id", productId)
      .single();

    if (productError) throw new Error(`Product not found: ${productError.message}`);
    logStep("Product fetched", { name: product.name });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://worldmusicmethod.lovable.app";

    // Build checkout session options
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: currency || "usd",
            product_data: {
              name: product.name,
              description: product.description || undefined,
            },
            unit_amount: priceAmount, // Already in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&course_id=${courseId || ""}`,
      cancel_url: `${origin}/payment-cancelled?product_id=${productId}`,
      allow_promotion_codes: true, // Enable Stripe's built-in coupon/promo code field
      metadata: {
        product_id: productId,
        course_id: courseId || "",
        user_id: user.id,
        region: region,
      },
      payment_intent_data: {
        metadata: {
          product_id: productId,
          course_id: courseId || "",
          user_id: user.id,
        },
      },
      // Enable multiple payment methods
      payment_method_types: ['card'],
    };

    // If a specific coupon code was provided, try to apply it as a discount
    if (couponCode) {
      try {
        // Try to find the coupon in Stripe
        const coupons = await stripe.coupons.list({ limit: 100 });
        const matchingCoupon = coupons.data.find(
          (c: Stripe.Coupon) => c.name?.toUpperCase() === couponCode.toUpperCase() || c.id.toUpperCase() === couponCode.toUpperCase()
        );
        
        if (matchingCoupon) {
          sessionOptions.discounts = [{ coupon: matchingCoupon.id }];
          logStep("Coupon applied", { couponId: matchingCoupon.id });
        } else {
          // Try finding a promotion code instead
          const promoCodes = await stripe.promotionCodes.list({ code: couponCode, limit: 1 });
          if (promoCodes.data.length > 0 && promoCodes.data[0].active) {
            sessionOptions.discounts = [{ promotion_code: promoCodes.data[0].id }];
            logStep("Promotion code applied", { promoCodeId: promoCodes.data[0].id });
          } else {
            logStep("Coupon not found, user can enter manually", { couponCode });
          }
        }
      } catch (couponError) {
        logStep("Coupon lookup failed, continuing without", { error: String(couponError) });
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create(sessionOptions);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Create enrollment record (pending)
    if (courseId) {
      const { error: enrollError } = await supabaseClient
        .from("course_enrollments")
        .upsert({
          user_id: user.id,
          course_id: courseId,
          enrollment_type: "purchase",
          is_active: false, // Will be activated by webhook or manual verification
        }, {
          onConflict: "user_id,course_id"
        });

      if (enrollError) {
        logStep("Warning: Could not create pending enrollment", { error: enrollError.message });
      } else {
        logStep("Pending enrollment created");
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});