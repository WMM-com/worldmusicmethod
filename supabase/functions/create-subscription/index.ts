import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      productId, 
      email, 
      fullName, 
      paymentMethod, 
      paymentMethodId, 
      couponCode,
      returnUrl 
    } = await req.json();

    logStep("Starting subscription creation", { productId, email, fullName, paymentMethod });

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

    if (product.product_type !== 'subscription') {
      throw new Error("Product is not a subscription");
    }

    logStep("Product found", { 
      name: product.name, 
      interval: product.billing_interval,
      price: product.base_price_usd,
      trialEnabled: product.trial_enabled 
    });

    // Map billing interval to Stripe interval
    const intervalMap: Record<string, Stripe.PriceCreateParams.Recurring.Interval> = {
      'daily': 'day',
      'weekly': 'week',
      'monthly': 'month',
      'annual': 'year',
    };

    const stripeInterval = intervalMap[product.billing_interval || 'monthly'];

    if (paymentMethod === 'stripe') {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      // Find or create customer
      const customers = await stripe.customers.list({ email, limit: 1 });
      let customerId: string;

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing customer found", { customerId });
      } else {
        const customer = await stripe.customers.create({
          email,
          name: fullName,
        });
        customerId = customer.id;
        logStep("New customer created", { customerId });
      }

      // Attach payment method if provided
      if (paymentMethodId) {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
        logStep("Payment method attached", { paymentMethodId });
      }

      // Create or get price
      const priceAmount = Math.round((product.base_price_usd || 0) * 100);
      
      // Search for existing price
      const prices = await stripe.prices.list({
        lookup_keys: [`subscription_${productId}_${stripeInterval}`],
        limit: 1,
      });

      let priceId: string;
      
      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
      } else {
        // Create product in Stripe if needed
        const stripeProducts = await stripe.products.list({ limit: 1 });
        let stripeProductId: string;
        
        const existingProduct = stripeProducts.data.find((p: any) => 
          p.metadata?.supabase_product_id === productId
        );
        
        if (existingProduct) {
          stripeProductId = existingProduct.id;
        } else {
          const newProduct = await stripe.products.create({
            name: product.name,
            metadata: { supabase_product_id: productId },
          });
          stripeProductId = newProduct.id;
        }

        const newPrice = await stripe.prices.create({
          product: stripeProductId,
          unit_amount: priceAmount,
          currency: 'usd',
          recurring: { interval: stripeInterval },
          lookup_key: `subscription_${productId}_${stripeInterval}`,
        });
        priceId = newPrice.id;
      }

      logStep("Price ready", { priceId, amount: priceAmount });

      // Create subscription
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          product_id: productId,
          product_name: product.name,
          email,
          full_name: fullName,
        },
      };

      // Handle trial
      if (product.trial_enabled && product.trial_length_days) {
        if (product.trial_price_usd === 0 || product.trial_price_usd === null) {
          // Free trial
          subscriptionParams.trial_period_days = product.trial_length_days;
          logStep("Free trial added", { days: product.trial_length_days });
        } else {
          // Paid trial - will need to handle separately
          logStep("Paid trial", { price: product.trial_price_usd, days: product.trial_length_days });
        }
      }

      const subscription = await stripe.subscriptions.create(subscriptionParams);
      logStep("Stripe subscription created", { subscriptionId: subscription.id, status: subscription.status });

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

      // Save to database
      const { data: dbSubscription, error: dbError } = await supabaseClient
        .from('subscriptions')
        .insert({
          product_id: productId,
          payment_provider: 'stripe',
          provider_subscription_id: subscription.id,
          status: subscription.status === 'active' ? 'active' : 'trialing',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          customer_name: fullName,
          customer_email: email,
          amount: product.base_price_usd,
          currency: 'USD',
          interval: product.billing_interval,
          trial_ends_at: subscription.trial_end 
            ? new Date(subscription.trial_end * 1000).toISOString() 
            : null,
          coupon_code: couponCode || null,
        })
        .select()
        .single();

      if (dbError) {
        logStep("Database error", dbError);
      } else {
        logStep("Subscription saved to database", { id: dbSubscription.id });
      }

      return new Response(
        JSON.stringify({
          subscriptionId: subscription.id,
          clientSecret: paymentIntent?.client_secret,
          status: subscription.status,
          dbSubscriptionId: dbSubscription?.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (paymentMethod === 'paypal') {
      // PayPal subscription flow
      const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
      const clientSecret = Deno.env.get("PAYPAL_SECRET");
      const auth = btoa(`${clientId}:${clientSecret}`);

      // Get access token
      const tokenResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        throw new Error("Failed to get PayPal access token");
      }

      const accessToken = tokenData.access_token;

      // Map interval to PayPal
      const paypalIntervalMap: Record<string, { interval_unit: string; interval_count: number }> = {
        'daily': { interval_unit: 'DAY', interval_count: 1 },
        'weekly': { interval_unit: 'WEEK', interval_count: 1 },
        'monthly': { interval_unit: 'MONTH', interval_count: 1 },
        'annual': { interval_unit: 'YEAR', interval_count: 1 },
      };

      const paypalInterval = paypalIntervalMap[product.billing_interval || 'monthly'];

      // Create product in PayPal
      const productResponse = await fetch("https://api-m.paypal.com/v1/catalogs/products", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: product.name,
          type: "SERVICE",
          category: "EDUCATIONAL_AND_TEXTBOOKS",
        }),
      });

      const paypalProduct = await productResponse.json();
      logStep("PayPal product created", { productId: paypalProduct.id });

      // Create billing plan
      const planPayload: any = {
        product_id: paypalProduct.id,
        name: `${product.name} - ${product.billing_interval}`,
        billing_cycles: [
          {
            frequency: {
              interval_unit: paypalInterval.interval_unit,
              interval_count: paypalInterval.interval_count,
            },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0, // Infinite
            pricing_scheme: {
              fixed_price: {
                value: product.base_price_usd?.toFixed(2) || "0.00",
                currency_code: "USD",
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          payment_failure_threshold: 3,
        },
      };

      // Add trial if enabled
      if (product.trial_enabled && product.trial_length_days) {
        planPayload.billing_cycles.unshift({
          frequency: {
            interval_unit: "DAY",
            interval_count: product.trial_length_days,
          },
          tenure_type: "TRIAL",
          sequence: 1,
          total_cycles: 1,
          pricing_scheme: {
            fixed_price: {
              value: (product.trial_price_usd || 0).toFixed(2),
              currency_code: "USD",
            },
          },
        });
        // Update regular cycle sequence
        planPayload.billing_cycles[1].sequence = 2;
      }

      const planResponse = await fetch("https://api-m.paypal.com/v1/billing/plans", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planPayload),
      });

      const plan = await planResponse.json();
      logStep("PayPal plan created", { planId: plan.id });

      // Create subscription
      const subscriptionResponse = await fetch("https://api-m.paypal.com/v1/billing/subscriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: plan.id,
          subscriber: {
            name: { given_name: fullName.split(' ')[0], surname: fullName.split(' ').slice(1).join(' ') || '' },
            email_address: email,
          },
          application_context: {
            brand_name: "Pickup Music",
            return_url: returnUrl || `${Deno.env.get("SUPABASE_URL")?.replace('supabase.co', 'supabase.co')}/payment-success`,
            cancel_url: returnUrl?.replace('success', 'cancelled') || `${Deno.env.get("SUPABASE_URL")}/payment-cancelled`,
          },
        }),
      });

      const paypalSubscription = await subscriptionResponse.json();
      logStep("PayPal subscription created", { subscriptionId: paypalSubscription.id });

      const approveUrl = paypalSubscription.links?.find((l: any) => l.rel === "approve")?.href;

      // Save to database
      const { data: dbSubscription } = await supabaseClient
        .from('subscriptions')
        .insert({
          product_id: productId,
          payment_provider: 'paypal',
          provider_subscription_id: paypalSubscription.id,
          status: 'pending',
          customer_name: fullName,
          customer_email: email,
          amount: product.base_price_usd,
          currency: 'USD',
          interval: product.billing_interval,
          trial_ends_at: product.trial_enabled && product.trial_length_days 
            ? new Date(Date.now() + product.trial_length_days * 24 * 60 * 60 * 1000).toISOString()
            : null,
          coupon_code: couponCode || null,
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({
          subscriptionId: paypalSubscription.id,
          approveUrl,
          status: paypalSubscription.status,
          dbSubscriptionId: dbSubscription?.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid payment method");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
