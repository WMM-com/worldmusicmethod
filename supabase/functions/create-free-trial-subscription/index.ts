import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-FREE-TRIAL-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, email, fullName, password, paymentMethodId, couponCode, currency, amount } = await req.json();

    logStep("Starting free trial subscription", { productId, email, fullName, currency, amount });

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

    // Verify this is a free trial product
    if (!product.trial_enabled || (product.trial_price_usd && product.trial_price_usd > 0)) {
      throw new Error("This product does not have a free trial");
    }

    if (product.product_type !== 'subscription' && product.product_type !== 'membership') {
      throw new Error("Product is not a subscription or membership");
    }

    logStep("Product verified for free trial", { 
      name: product.name,
      trialDays: product.trial_length_days,
      basePrice: product.base_price_usd
    });

    // Check if user exists or create new one
    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    let user = existingUsers?.users?.find(u => u.email === email);
    let userId: string;
    let isNewUser = false;

    if (user) {
      userId = user.id;
      logStep("Existing user found", { userId });
      
      // Set email_verified for existing user
      const { error: verifyError } = await supabaseClient
        .from("profiles")
        .update({ email_verified: true, email_verified_at: new Date().toISOString() })
        .eq("id", userId);
      
      if (verifyError) {
        logStep("Warning: Could not set email_verified for existing user", { error: verifyError });
      } else {
        logStep("Email verified set for existing user", { userId });
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      isNewUser = true;
      logStep("New user created", { userId });
      
      // Wait for profile trigger to create the profile row
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Set email_verified with retries
      let verifySuccess = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { error: verifyError, data: verifyData } = await supabaseClient
          .from("profiles")
          .update({ email_verified: true, email_verified_at: new Date().toISOString() })
          .eq("id", userId)
          .select('email_verified');
        
        if (!verifyError && verifyData && verifyData.length > 0) {
          verifySuccess = true;
          logStep("Email verified set for new user", { userId, attempt });
          break;
        }
        
        logStep("Profile update retry", { attempt, error: verifyError, data: verifyData });
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // If still failed, try upsert as fallback
      if (!verifySuccess) {
        logStep("Attempting upsert for email_verified", { userId });
        const { error: upsertError } = await supabaseClient
          .from("profiles")
          .upsert({ 
            id: userId, 
            email: email.toLowerCase(),
            email_verified: true, 
            email_verified_at: new Date().toISOString() 
          }, { onConflict: 'id' });
        
        if (!upsertError) {
          logStep("Email verified set via upsert", { userId });
        } else {
          logStep("CRITICAL: Could not set email_verified for new user", { userId, error: upsertError });
        }
      }
      
      // Verify the update actually worked
      const { data: checkProfile } = await supabaseClient
        .from("profiles")
        .select('email_verified')
        .eq("id", userId)
        .single();
      
      logStep("Final email_verified state", { userId, email_verified: checkProfile?.email_verified });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Map billing interval to Stripe
    const intervalMap: Record<string, Stripe.PriceCreateParams.Recurring.Interval> = {
      'daily': 'day',
      'weekly': 'week',
      'monthly': 'month',
      'yearly': 'year',
      'annual': 'year',
    };
    const billingInterval = product.billing_interval || 'monthly';
    const stripeInterval = intervalMap[billingInterval] || 'month';

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email,
        name: fullName,
        metadata: { user_id: userId },
      });
      customerId = customer.id;
      logStep("New Stripe customer created", { customerId });
    }

    // Attach payment method if provided (for future billing after trial)
    if (paymentMethodId) {
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (!pm.customer) {
          await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        }
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
        logStep("Payment method attached for future billing", { paymentMethodId });
      } catch (pmErr: any) {
        logStep("Payment method handling note", { message: pmErr.message });
      }
    }

    // Create or get recurring price in Stripe using geo-adjusted currency
    const geoCurrency = (currency || 'USD').toLowerCase();
    const geoAmount = amount || product.base_price_usd || 0;
    const priceAmount = Math.round(geoAmount * 100);
    const lookupKey = `sub_${productId}_${stripeInterval}_${geoCurrency}`;

    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    let priceId: string;

    if (prices.data.length > 0) {
      priceId = prices.data[0].id;
      logStep("Existing Stripe price found", { priceId, currency: geoCurrency });
    } else {
      // Find or create Stripe product
      const stripeProducts = await stripe.products.list({ limit: 100 });
      const existingProduct = stripeProducts.data.find((p: any) => 
        p.metadata?.supabase_product_id === productId
      );

      let stripeProductId: string;
      if (existingProduct) {
        stripeProductId = existingProduct.id;
      } else {
        const newProduct = await stripe.products.create({
          name: product.name,
          metadata: { supabase_product_id: productId },
        });
        stripeProductId = newProduct.id;
        logStep("Created Stripe product", { stripeProductId });
      }

      const newPrice = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: priceAmount,
        currency: geoCurrency,
        recurring: { interval: stripeInterval },
        lookup_key: lookupKey,
      });
      priceId = newPrice.id;
      logStep("Created Stripe price", { priceId, interval: stripeInterval, currency: geoCurrency });
    }

    // Create subscription with trial_period_days (NO upfront charge)
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: product.trial_length_days,
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      metadata: {
        supabase_product_id: productId,
        product_name: product.name,
        user_id: userId,
        is_free_trial: 'true',
      },
    };

    if (paymentMethodId) {
      subscriptionParams.default_payment_method = paymentMethodId;
    }

    // Handle coupon if provided
    if (couponCode) {
      try {
        const { data: dbCoupon } = await supabaseClient
          .from('coupons')
          .select('*')
          .ilike('code', couponCode.trim())
          .eq('is_active', true)
          .single();

        if (dbCoupon && dbCoupon.applies_to_subscriptions) {
          let stripeCouponId = dbCoupon.stripe_coupon_id;

          if (!stripeCouponId) {
            const stripeCouponParams: Stripe.CouponCreateParams = {
              name: dbCoupon.name || dbCoupon.code,
              duration: dbCoupon.duration as 'once' | 'repeating' | 'forever',
            };

            if (dbCoupon.duration === 'repeating' && dbCoupon.duration_in_months) {
              stripeCouponParams.duration_in_months = dbCoupon.duration_in_months;
            }

            if (dbCoupon.discount_type === 'percentage' && dbCoupon.percent_off) {
              stripeCouponParams.percent_off = dbCoupon.percent_off;
            } else if (dbCoupon.discount_type === 'fixed' && dbCoupon.amount_off) {
              stripeCouponParams.amount_off = Math.round(dbCoupon.amount_off * 100);
              stripeCouponParams.currency = (dbCoupon.currency || 'USD').toLowerCase();
            }

            const stripeCoupon = await stripe.coupons.create(stripeCouponParams);
            stripeCouponId = stripeCoupon.id;

            await supabaseClient
              .from('coupons')
              .update({ stripe_coupon_id: stripeCouponId })
              .eq('id', dbCoupon.id);
          }

          subscriptionParams.discounts = [{ coupon: stripeCouponId }];
          logStep("Coupon applied to subscription", { code: dbCoupon.code, stripeCouponId });
        }
      } catch (couponError) {
        logStep("Coupon handling note", { error: String(couponError) });
      }
    }

    const stripeSubscription = await stripe.subscriptions.create(subscriptionParams);
    
    logStep("Stripe subscription created with free trial", {
      subscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      trialEnd: stripeSubscription.trial_end,
    });

    // Calculate dates
    const periodStart = new Date();
    const trialEndDate = stripeSubscription.trial_end 
      ? new Date(stripeSubscription.trial_end * 1000)
      : new Date(Date.now() + (product.trial_length_days * 24 * 60 * 60 * 1000));

    // Create subscription record in database with geo-adjusted amount and currency
    const { data: dbSubscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .insert({
        user_id: userId,
        product_id: productId,
        product_name: product.name,
        customer_email: email.toLowerCase(),
        customer_name: fullName,
        status: 'active', // Free trial is considered active
        payment_provider: 'stripe',
        provider_subscription_id: stripeSubscription.id,
        amount: geoAmount,
        currency: geoCurrency.toUpperCase(),
        interval: billingInterval,
        current_period_start: periodStart.toISOString(),
        current_period_end: trialEndDate.toISOString(),
        trial_end: trialEndDate.toISOString(),
        trial_ends_at: trialEndDate.toISOString(),
        coupon_code: couponCode || null,
      })
      .select('id')
      .single();

    if (subError) {
      logStep("Subscription DB creation error", { error: subError });
    } else {
      logStep("DB Subscription created", { dbSubscriptionId: dbSubscription.id });
    }

    // Grant access to courses from subscription_items
    const enrolledCourseIds: string[] = [];
    const { data: subItems } = await supabaseClient
      .from('subscription_items')
      .select('item_id, item_type')
      .eq('subscription_product_id', productId);

    if (subItems && subItems.length > 0) {
      for (const item of subItems) {
        if (item.item_type === 'course') {
          const { error: enrollError } = await supabaseClient
            .from('course_enrollments')
            .upsert({
              user_id: userId,
              course_id: item.item_id,
              enrollment_type: 'subscription',
              is_active: true,
            }, { onConflict: 'user_id,course_id' });

          if (!enrollError) {
            enrolledCourseIds.push(item.item_id);
            logStep("Enrolled in course", { courseId: item.item_id });
          }
        } else if (item.item_type === 'course_group') {
          const { data: groupCourses } = await supabaseClient
            .from('course_group_courses')
            .select('course_id')
            .eq('group_id', item.item_id);

          if (groupCourses) {
            for (const gc of groupCourses) {
              const { error: enrollError } = await supabaseClient
                .from('course_enrollments')
                .upsert({
                  user_id: userId,
                  course_id: gc.course_id,
                  enrollment_type: 'subscription',
                  is_active: true,
                }, { onConflict: 'user_id,course_id' });

              if (!enrollError) {
                enrolledCourseIds.push(gc.course_id);
              }
            }
          }
        }
      }
    }

    // Assign purchase tag if configured
    if (product.purchase_tag_id) {
      const { data: emailContact } = await supabaseClient
        .from('email_contacts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (emailContact) {
        await supabaseClient
          .from('contact_tags')
          .upsert({
            contact_id: emailContact.id,
            tag_id: product.purchase_tag_id,
          }, { onConflict: 'contact_id,tag_id' });
        logStep("Purchase tag assigned", { tagId: product.purchase_tag_id });
      }
    }

    logStep("Free trial subscription completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: stripeSubscription.id,
        dbSubscriptionId: dbSubscription?.id,
        userId,
        trialEndDate: trialEndDate.toISOString(),
        courseIds: enrolledCourseIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});