import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sanitizeIdentifier(id: string): string {
  if (!id || typeof id !== 'string') return '';
  return id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36);
}

function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.replace(/[,()]/g, '').toLowerCase().slice(0, 255);
}

const logStep = (step: string, details?: any) => {
  console.log(`[COMPLETE-STRIPE-PAYMENT] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentIntentId, password } = await req.json();
    
    logStep("Starting", { paymentIntentId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
    }

    logStep("Payment verified", { status: paymentIntent.status });

    const { 
      email, 
      full_name, 
      product_ids, 
      product_details,
      currency,
    } = paymentIntent.metadata;

    // Parse multi-product data
    let productIds: string[] = [];
    let productDetailsList: { id: string; name: string; course_id: string | null; amount: number; product_type?: string }[] = [];
    
    try {
      productIds = product_ids ? JSON.parse(product_ids) : [];
      productDetailsList = product_details ? JSON.parse(product_details) : [];
    } catch (e) {
      logStep("Legacy single product format detected");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch product details to check for subscription/membership types
    const { data: productsData } = await supabaseClient
      .from('products')
      .select('id, name, product_type, billing_interval, trial_enabled, trial_length_days, trial_price_usd, base_price_usd')
      .in('id', productIds);

    const productsMap = new Map(productsData?.map(p => [p.id, p]) || []);

    // Check if user exists
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
    const user = existingUser?.users?.find(u => u.email === email);

    let userId: string;
    let isNewUser = false;
    let sessionToken: string | null = null;

    if (user) {
      userId = user.id;
      logStep("Existing user found", { userId });
      
      await supabaseClient
        .from("profiles")
        .update({ email_verified: true, email_verified_at: new Date().toISOString() })
        .eq("id", userId);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      isNewUser = true;
      logStep("New user created", { userId });

      await new Promise(resolve => setTimeout(resolve, 500));
      
      await supabaseClient
        .from("profiles")
        .update({ email_verified: true, email_verified_at: new Date().toISOString() })
        .eq("id", userId);
    }

    // Create course enrollments for ALL products that are courses
    const courseIds: string[] = [];
    for (const detail of productDetailsList) {
      if (detail.course_id) {
        const { error: enrollError } = await supabaseClient
          .from("course_enrollments")
          .upsert({
            user_id: userId,
            course_id: detail.course_id,
            enrollment_type: "purchase",
            is_active: true,
          }, {
            onConflict: "user_id,course_id",
          });

        if (!enrollError) {
          courseIds.push(detail.course_id);
          logStep("Course enrollment created", { courseId: detail.course_id });
        }
      }
    }

    // Calculate discount ratio
    const paymentAmount = paymentIntent.amount / 100;
    const paymentCurrency = (currency || paymentIntent.currency || 'USD').toUpperCase();
    const totalOriginalAmount = productDetailsList.reduce((sum, d) => sum + d.amount, 0);
    const discountRatio = totalOriginalAmount > 0 ? paymentAmount / totalOriginalAmount : 1;

    // Track created subscriptions
    const subscriptionIdsByProduct = new Map<string, string>();
    
    // Handle subscription/membership products
    for (const detail of productDetailsList) {
      const productInfo = productsMap.get(detail.id);
      
      if (productInfo && (productInfo.product_type === 'subscription' || productInfo.product_type === 'membership')) {
        logStep("Processing subscription product", { productId: detail.id, productType: productInfo.product_type });
        
        // Map billing interval to Stripe interval (dynamic from product)
        const intervalMap: Record<string, Stripe.PriceCreateParams.Recurring.Interval> = {
          'daily': 'day',
          'weekly': 'week',
          'monthly': 'month',
          'yearly': 'year',
          'annual': 'year',
        };
        const billingInterval = productInfo.billing_interval || 'monthly';
        const stripeInterval = intervalMap[billingInterval] || 'month';
        
        logStep("Billing interval from product", { billingInterval, stripeInterval });
        
        // Create or get Stripe customer
        const customers = await stripe.customers.list({ email, limit: 1 });
        let customerId: string;
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          logStep("Existing Stripe customer found", { customerId });
        } else {
          const customer = await stripe.customers.create({
            email,
            name: full_name,
            metadata: { user_id: userId },
          });
          customerId = customer.id;
          logStep("New Stripe customer created", { customerId });
        }
        
        // Attach payment method to customer if possible
        let paymentMethodId: string | null = null;
        if (paymentIntent.payment_method) {
          const pmId = typeof paymentIntent.payment_method === 'string' 
            ? paymentIntent.payment_method 
            : paymentIntent.payment_method.id;
          
          try {
            const pm = await stripe.paymentMethods.retrieve(pmId);
            
            if (pm.customer === customerId) {
              paymentMethodId = pmId;
              logStep("Payment method already attached", { pmId });
            } else if (!pm.customer) {
              await stripe.paymentMethods.attach(pmId, { customer: customerId });
              paymentMethodId = pmId;
              logStep("Payment method attached", { pmId });
            }
            
            if (paymentMethodId) {
              await stripe.customers.update(customerId, {
                invoice_settings: { default_payment_method: paymentMethodId },
              });
            }
          } catch (pmErr: any) {
            logStep("Payment method handling note", { message: pmErr.message });
          }
        }
        
        // Create or get recurring price in Stripe
        const priceAmount = Math.round((productInfo.base_price_usd || 0) * 100);
        const lookupKey = `sub_${detail.id}_${stripeInterval}`;
        
        const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
        let priceId: string;
        
        if (prices.data.length > 0) {
          priceId = prices.data[0].id;
          logStep("Existing Stripe price found", { priceId });
        } else {
          // Find or create Stripe product
          const stripeProducts = await stripe.products.list({ limit: 100 });
          const existingProduct = stripeProducts.data.find((p: any) => 
            p.metadata?.supabase_product_id === detail.id
          );
          
          let stripeProductId: string;
          if (existingProduct) {
            stripeProductId = existingProduct.id;
          } else {
            const newProduct = await stripe.products.create({
              name: detail.name,
              metadata: { supabase_product_id: detail.id },
            });
            stripeProductId = newProduct.id;
            logStep("Created Stripe product", { stripeProductId });
          }
          
          const newPrice = await stripe.prices.create({
            product: stripeProductId,
            unit_amount: priceAmount,
            currency: 'usd',
            recurring: { interval: stripeInterval },
            lookup_key: lookupKey,
          });
          priceId = newPrice.id;
          logStep("Created Stripe price", { priceId, interval: stripeInterval });
        }
        
        // Create subscription with a future billing date.
        // For non-trial products: we set the "trial_end" to the end of the first paid period
        // (the customer already paid via the initial PaymentIntent).
        // For trial products: we set "trial_end" to the configured trial length from the product.
        const now = Math.floor(Date.now() / 1000);

        // Calculate next billing date based on interval
        let nextBillingTimestamp: number;
        switch (stripeInterval) {
          case 'day':
            nextBillingTimestamp = now + 86400; // 1 day
            break;
          case 'week':
            nextBillingTimestamp = now + 604800; // 7 days
            break;
          case 'month':
            nextBillingTimestamp = now + 2592000; // ~30 days
            break;
          case 'year':
            nextBillingTimestamp = now + 31536000; // 365 days
            break;
          default:
            nextBillingTimestamp = now + 2592000;
        }

        let trialEndTimestamp = nextBillingTimestamp;
        if (productInfo.trial_enabled && productInfo.trial_length_days) {
          trialEndTimestamp = now + productInfo.trial_length_days * 86400;
          logStep("Trial period applied from product", { days: productInfo.trial_length_days });
        }

        const subscriptionParams: Stripe.SubscriptionCreateParams = {
          customer: customerId,
          items: [{ price: priceId }],
          // Billing starts after trial_end
          trial_end: trialEndTimestamp,
          metadata: {
            supabase_product_id: detail.id,
            product_name: detail.name,
            user_id: userId,
            initial_payment_intent: paymentIntentId,
          },
          payment_settings: {
            payment_method_types: ['card'],
            save_default_payment_method: 'on_subscription',
          },
        };

        if (paymentMethodId) {
          subscriptionParams.default_payment_method = paymentMethodId;
        }

        const stripeSubscription = await stripe.subscriptions.create(subscriptionParams);
        logStep("Stripe subscription created", { 
          subscriptionId: stripeSubscription.id, 
          status: stripeSubscription.status,
          trialEnd: stripeSubscription.trial_end,
        });
        
        // Calculate dates for DB
        const periodStart = new Date();
        const periodEnd = stripeSubscription.trial_end 
          ? new Date(stripeSubscription.trial_end * 1000)
          : new Date(nextBillingTimestamp * 1000);
        
        const trialEndDate = stripeSubscription.trial_end 
          ? new Date(stripeSubscription.trial_end * 1000) 
          : null;

        // Create the subscription record
        const { data: subscription, error: subError } = await supabaseClient
          .from('subscriptions')
          .insert({
            user_id: userId,
            product_id: detail.id,
            product_name: detail.name,
            customer_email: email.toLowerCase(),
            customer_name: full_name,
            status: stripeSubscription.status === 'trialing' ? 'active' : stripeSubscription.status,
            payment_provider: 'stripe',
            provider_subscription_id: stripeSubscription.id,
            amount: productInfo.base_price_usd,
            currency: paymentCurrency,
            interval: billingInterval,
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            trial_end: trialEndDate?.toISOString() || null,
            trial_ends_at: trialEndDate?.toISOString() || null,
          })
          .select('id')
          .single();

        if (subError) {
          logStep("Subscription creation error", { error: subError });
        } else {
          subscriptionIdsByProduct.set(detail.id, subscription.id);
          logStep("DB Subscription created", { 
            dbSubscriptionId: subscription.id, 
            stripeSubId: stripeSubscription.id,
            interval: billingInterval 
          });
        }

        // Grant access to courses from subscription_items
        const { data: subItems } = await supabaseClient
          .from('subscription_items')
          .select('item_id, item_type')
          .eq('subscription_product_id', detail.id);

        if (subItems && subItems.length > 0) {
          logStep("Processing subscription items", { count: subItems.length });
          
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
                courseIds.push(item.item_id);
                logStep("Enrolled in course from subscription", { courseId: item.item_id });
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
                    courseIds.push(gc.course_id);
                  }
                }
                logStep("Enrolled in courses from course group", { groupId: item.item_id, courseCount: groupCourses.length });
              }
            } else if (item.item_type === 'product') {
              const { data: linkedProduct } = await supabaseClient
                .from('products')
                .select('course_id')
                .eq('id', item.item_id)
                .single();

              if (linkedProduct?.course_id) {
                const { error: enrollError } = await supabaseClient
                  .from('course_enrollments')
                  .upsert({
                    user_id: userId,
                    course_id: linkedProduct.course_id,
                    enrollment_type: 'subscription',
                    is_active: true,
                  }, { onConflict: 'user_id,course_id' });

                if (!enrollError) {
                  courseIds.push(linkedProduct.course_id);
                  logStep("Enrolled in course from linked product", { productId: item.item_id, courseId: linkedProduct.course_id });
                }
              }
            }
          }
        }
      }
    }
    
    // Create order records for EACH product
    for (const detail of productDetailsList) {
      try {
        const discountedAmount = detail.amount * discountRatio;
        const subscriptionId = subscriptionIdsByProduct.get(detail.id) || null;
        
        const { error: orderError } = await supabaseClient
          .from("orders")
          .insert({
            user_id: userId,
            email: email.toLowerCase(),
            product_id: detail.id,
            amount: discountedAmount,
            currency: paymentCurrency,
            payment_provider: "stripe",
            provider_payment_id: paymentIntentId,
            status: "completed",
            customer_name: full_name,
            subscription_id: subscriptionId,
          });

        if (orderError) {
          logStep("Order creation error", { error: orderError });
        } else {
          logStep("Order created for product", { productId: detail.id, amount: discountedAmount, subscriptionId });
        }
      } catch (orderErr) {
        logStep("Order insert failed", { error: orderErr });
      }
    }

    // Mark any cart abandonment as recovered
    const safeUserId = userId ? sanitizeIdentifier(userId) : '';
    const safeEmail = email ? sanitizeEmail(email) : '';
    
    const filterParts = [];
    if (safeUserId) filterParts.push(`user_id.eq.${safeUserId}`);
    if (safeEmail) filterParts.push(`email.eq.${safeEmail}`);
    
    if (filterParts.length > 0) {
      await supabaseClient
        .from("cart_abandonment")
        .update({ recovered_at: new Date().toISOString() })
        .or(filterParts.join(','))
        .is("recovered_at", null);
    }

    // Assign purchase tags for each product
    for (const detail of productDetailsList) {
      try {
        const tagName = `Purchased: ${detail.name}`;
        let tagId: string | undefined;

        const { data: existingTag } = await supabaseClient
          .from("email_tags")
          .select("id")
          .eq("name", tagName)
          .maybeSingle();

        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const { data: newTag } = await supabaseClient
            .from("email_tags")
            .insert({
              name: tagName,
              description: `Auto-created for ${detail.name} purchases`,
            })
            .select("id")
            .single();
          tagId = newTag?.id;
        }

        if (tagId) {
          await supabaseClient
            .from("user_tags")
            .upsert({
              user_id: userId,
              email: email?.toLowerCase(),
              tag_id: tagId,
              source: "purchase",
              source_id: detail.id,
            }, {
              onConflict: "user_id,tag_id",
              ignoreDuplicates: true,
            });
          logStep("Purchase tag assigned", { tagId, product: detail.name });
        }
      } catch (tagError) {
        logStep("Tag error (non-fatal)", { error: tagError });
      }
    }

    // Trigger purchase sequences
    try {
      const { data: purchaseSequences } = await supabaseClient
        .from("email_sequences")
        .select("id")
        .eq("trigger_type", "purchase")
        .eq("is_active", true);

      if (purchaseSequences && purchaseSequences.length > 0) {
        let contactId: string | null = null;
        const { data: contact } = await supabaseClient
          .from("email_contacts")
          .select("id")
          .eq("email", email.toLowerCase())
          .maybeSingle();
        contactId = contact?.id || null;

        for (const seq of purchaseSequences) {
          const { data: firstStep } = await supabaseClient
            .from("email_sequence_steps")
            .select("delay_minutes")
            .eq("sequence_id", seq.id)
            .order("step_order")
            .limit(1)
            .single();

          const nextEmailAt = new Date(Date.now() + (firstStep?.delay_minutes || 0) * 60 * 1000).toISOString();

          await supabaseClient
            .from("email_sequence_enrollments")
            .insert({
              sequence_id: seq.id,
              contact_id: contactId,
              user_id: userId,
              email: email.toLowerCase(),
              status: "active",
              current_step: 0,
              next_email_at: nextEmailAt,
              metadata: { 
                source: "purchase", 
                product_ids: productIds,
                course_ids: courseIds,
                product_names: productDetailsList.map(p => p.name),
              },
            });
          logStep("Enrolled in purchase sequence", { sequenceId: seq.id });
        }
      }
    } catch (seqError) {
      logStep("Sequence error (non-fatal)", { error: seqError });
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        courseIds: [...new Set(courseIds)],
        isNewUser,
        email,
        password: isNewUser ? password : undefined,
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
