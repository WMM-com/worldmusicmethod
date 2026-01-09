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
      couponDiscount,
      amount,
      currency,
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

    if (product.product_type !== 'subscription' && product.product_type !== 'membership') {
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

      // Use geo-adjusted currency and amount passed from frontend
      const geoCurrency = (currency || 'USD').toLowerCase();
      const geoAmount = (typeof amount === 'number' && isFinite(amount))
        ? amount
        : (product.base_price_usd || 0);
      const priceAmount = Math.round(geoAmount * 100);

      // IMPORTANT: Stripe Prices are immutable.
      // We use a lookup key that includes the exact unit amount to ensure correct pricing.
      const lookupKeyV2 = `sub_${productId}_${stripeInterval}_${geoCurrency}_${priceAmount}`;
      const legacyLookupKey = `subscription_${productId}_${stripeInterval}`;

      // Prefer v2 lookup key that bakes in the unit amount
      const v2Prices = await stripe.prices.list({ lookup_keys: [lookupKeyV2], limit: 1 });
      let priceId: string | null = v2Prices.data.length > 0 ? v2Prices.data[0].id : null;

      if (priceId) {
        logStep("Existing Stripe price found (v2)", { priceId, currency: geoCurrency, unitAmount: priceAmount });
      }

      // Backward-compat: if we only have a legacy key, only reuse it if it matches the desired amount
      if (!priceId) {
        const legacyPrices = await stripe.prices.list({ lookup_keys: [legacyLookupKey], limit: 1 });
        const legacy = legacyPrices.data[0];

        if (legacy && legacy.unit_amount === priceAmount && legacy.currency === geoCurrency) {
          priceId = legacy.id;
          logStep("Existing Stripe price found (legacy, matches)", { priceId, currency: geoCurrency, unitAmount: priceAmount });
        } else if (legacy) {
          logStep("Legacy Stripe price mismatch; will create a new price", {
            legacyPriceId: legacy.id,
            legacyUnitAmount: legacy.unit_amount,
            desiredUnitAmount: priceAmount,
            currency: geoCurrency,
          });
        }
      }

      if (!priceId) {
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
          lookup_key: lookupKeyV2,
        });
        priceId = newPrice.id;
        logStep("Created Stripe price", { priceId, interval: stripeInterval, currency: geoCurrency, unitAmount: priceAmount });
      }

      logStep("Price ready", { priceId, amount: priceAmount, currency: geoCurrency });

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

      // IMPORTANT: Do NOT apply Stripe coupon here!
      // The 'amount' passed from frontend already includes coupon discount + 2% card discount.
      // If we also attach a Stripe coupon, the discount gets applied TWICE.
      // We only store coupon_code in DB for record-keeping.
      if (couponCode) {
        logStep("Coupon recorded (discount already in price)", { code: couponCode });
      }

      const subscription = await stripe.subscriptions.create(subscriptionParams);
      logStep("Stripe subscription created", { subscriptionId: subscription.id, status: subscription.status });

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

      // Use passed currency (from geo pricing) or default to USD
      const subscriptionCurrency = (typeof currency === 'string' && currency.trim()) 
        ? currency.trim().toUpperCase() 
        : 'USD';

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
          amount: typeof amount === 'number' && isFinite(amount) ? amount : product.base_price_usd,
          currency: subscriptionCurrency,
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
      const currencyCode = (typeof currency === 'string' && currency.trim())
        ? currency.trim().toUpperCase()
        : 'USD';

      const recurringAmount = typeof amount === 'number' && isFinite(amount)
        ? amount
        : (product.base_price_usd || 0);

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
                value: recurringAmount.toFixed(2),
                currency_code: currencyCode,
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

      if (!planResponse.ok) {
        const planErrorText = await planResponse.text();
        logStep("PayPal plan creation failed", { status: planResponse.status, error: planErrorText });
        throw new Error(`PayPal plan creation failed: ${planErrorText}`);
      }

      const plan = await planResponse.json();
      
      if (!plan || !plan.id) {
        logStep("ERROR: PayPal plan response missing id", { plan });
        throw new Error("PayPal plan creation returned invalid response - missing plan ID");
      }
      
      logStep("PayPal plan created", { planId: plan.id, status: plan.status });

      // Create subscription with validated plan_id
      const subscriptionPayload = {
        plan_id: plan.id,
        subscriber: {
          name: { given_name: fullName.split(' ')[0], surname: fullName.split(' ').slice(1).join(' ') || '' },
          email_address: email,
        },
        application_context: {
          brand_name: "World Music Method",
          return_url: returnUrl || `${Deno.env.get("SUPABASE_URL")?.replace('supabase.co', 'supabase.co')}/payment-success`,
          cancel_url: returnUrl?.replace('success', 'cancelled') || `${Deno.env.get("SUPABASE_URL")}/payment-cancelled`,
        },
      };
      
      logStep("Creating PayPal subscription", { plan_id: plan.id, subscriber_email: email });

      const subscriptionResponse = await fetch("https://api-m.paypal.com/v1/billing/subscriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscriptionPayload),
      });

      if (!subscriptionResponse.ok) {
        const errorText = await subscriptionResponse.text();
        logStep("PayPal subscription creation failed", { status: subscriptionResponse.status, error: errorText });
        throw new Error(`PayPal subscription creation failed: ${errorText}`);
      }

      const paypalSubscription = await subscriptionResponse.json();
      
      if (!paypalSubscription || !paypalSubscription.id) {
        logStep("ERROR: PayPal subscription response missing id", { response: paypalSubscription });
        throw new Error("PayPal subscription creation returned invalid response");
      }
      
      logStep("PayPal subscription created", { 
        subscriptionId: paypalSubscription.id, 
        status: paypalSubscription.status,
        linksCount: paypalSubscription.links?.length 
      });

      // Get the approve URL
      const approveUrl = paypalSubscription.links?.find((l: any) => l.rel === "approve")?.href;
      
      if (!approveUrl) {
        logStep("ERROR: No approve URL found in PayPal response", { links: paypalSubscription.links });
        throw new Error("PayPal did not return an approval URL");
      }
      
      logStep("Approve URL generated", { approveUrl });

      // IMPORTANT: Always store the base price (before discount) as the amount.
      // The coupon_discount field stores the discount value, and the UI calculates the effective price.
      const basePrice = product.base_price_usd || 0;
      
      // Save to database
      const { data: dbSubscription, error: dbSubError } = await supabaseClient
        .from('subscriptions')
        .insert({
          user_id: null,
          product_id: productId,
          product_name: product.name,
          payment_provider: 'paypal',
          provider_subscription_id: paypalSubscription.id,
          status: 'pending',
          customer_name: fullName,
          customer_email: email,
          amount: basePrice, // Store base price, NOT discounted amount
          currency: currencyCode,
          interval: product.billing_interval,
          trial_ends_at: product.trial_enabled && product.trial_length_days 
            ? new Date(Date.now() + product.trial_length_days * 24 * 60 * 60 * 1000).toISOString()
            : null,
          coupon_code: couponCode || null,
          coupon_discount: typeof couponDiscount === 'number' ? couponDiscount : null,
        })
        .select()
        .single();

      if (dbSubError) {
        logStep("Database error saving subscription", dbSubError);
      }

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
