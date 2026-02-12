import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getStripeSecretKey } from "../_shared/stripe-key.ts";

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

    const stripe = new Stripe(getStripeSecretKey(), {
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
      coupon_code,
      coupon_discount,
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

    // Prepare recurring subscription coupon (Stripe uses discounts[] in basil API versions)
    const normalizedCouponCode =
      typeof coupon_code === 'string' ? coupon_code.trim().toUpperCase() : '';

    let subscriptionCoupon:
      | {
          code: string;
          stripeCouponId: string;
          discount_type: 'percentage' | 'fixed';
          percent_off: number | null;
          amount_off: number | null;
          duration: 'once' | 'repeating' | 'forever';
          duration_in_months: number | null;
          currency: string | null;
        }
      | null = null;

    if (normalizedCouponCode) {
      const { data: couponRow, error: couponRowError } = await supabaseClient
        .from('coupons')
        .select('*')
        .ilike('code', normalizedCouponCode)
        .eq('is_active', true)
        .maybeSingle();

      if (couponRowError) {
        logStep('Coupon lookup error', { code: normalizedCouponCode, error: couponRowError });
      } else if (couponRow && couponRow.applies_to_subscriptions && couponRow.duration !== 'once') {
        const nowDate = new Date();
        const validFromOk = !couponRow.valid_from || new Date(couponRow.valid_from) <= nowDate;
        const validUntilOk = !couponRow.valid_until || new Date(couponRow.valid_until) >= nowDate;

        if (!validFromOk || !validUntilOk) {
          logStep('Coupon not valid for subscription dates', { code: normalizedCouponCode });
        } else {
          let stripeCouponId: string | null = couponRow.stripe_coupon_id;

          if (!stripeCouponId) {
            const stripeCouponParams: Stripe.CouponCreateParams = {
              name: couponRow.name || couponRow.code,
              duration: couponRow.duration as 'once' | 'repeating' | 'forever',
            };

            if (couponRow.duration === 'repeating' && couponRow.duration_in_months) {
              stripeCouponParams.duration_in_months = couponRow.duration_in_months;
            }

            if (couponRow.discount_type === 'percentage' && couponRow.percent_off) {
              stripeCouponParams.percent_off = couponRow.percent_off;
            } else if (couponRow.discount_type === 'fixed' && couponRow.amount_off) {
              stripeCouponParams.amount_off = Math.round(couponRow.amount_off * 100);
              stripeCouponParams.currency = (couponRow.currency || 'USD').toLowerCase();
            }

            const stripeCoupon = await stripe.coupons.create(stripeCouponParams);
            stripeCouponId = stripeCoupon.id;

            await supabaseClient
              .from('coupons')
              .update({ stripe_coupon_id: stripeCouponId })
              .eq('id', couponRow.id);

            logStep('Created Stripe coupon for subscription', { code: normalizedCouponCode, stripeCouponId });
          }

          if (stripeCouponId) {
            subscriptionCoupon = {
              code: couponRow.code,
              stripeCouponId,
              discount_type: couponRow.discount_type,
              percent_off: couponRow.percent_off,
              amount_off: couponRow.amount_off,
              duration: couponRow.duration,
              duration_in_months: couponRow.duration_in_months,
              currency: couponRow.currency,
            };
            logStep('Prepared subscription coupon', {
              code: couponRow.code,
              stripeCouponId,
              duration: couponRow.duration,
            });
          }
        }
      }
    }

    // Check if user exists
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
    const user = existingUser?.users?.find(u => u.email === email);

    let userId: string;
    let isNewUser = false;
    let sessionToken: string | null = null;

    if (user) {
      userId = user.id;
      logStep("Existing user found", { userId });
      
      // Retry email verification for existing user
      let verifySuccess = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({ email_verified: true, email_verified_at: new Date().toISOString() })
          .eq("id", userId);
        
        if (!updateError) {
          verifySuccess = true;
          logStep("Profile email_verified set to true for existing user", { userId, attempt });
          break;
        }
        
        logStep("Profile update retry for existing user", { attempt, error: updateError });
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      if (!verifySuccess) {
        logStep("WARNING: Could not set email_verified for existing user", { userId });
      }
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

      // Wait longer for profile trigger to create the profile row
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Ensure email_verified is set - retry more times
      let verifySuccess = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({ email_verified: true, email_verified_at: new Date().toISOString() })
          .eq("id", userId);
        
        if (!updateError) {
          verifySuccess = true;
          logStep("Profile email_verified set to true for new user", { userId, attempt });
          break;
        }
        
        logStep("Profile update retry for new user", { attempt, error: updateError });
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // If still failed, try upsert as last resort
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
          verifySuccess = true;
          logStep("Profile email_verified set via upsert for new user", { userId });
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
      
      logStep("Final email_verified state for new user", { userId, email_verified: checkProfile?.email_verified });
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
              logStep("Payment method already attached to this customer", { pmId });
            } else if (!pm.customer) {
              await stripe.paymentMethods.attach(pmId, { customer: customerId });
              paymentMethodId = pmId;
              logStep("Payment method attached", { pmId });
            } else {
              // Payment method attached to different customer - detach and reattach
              logStep("Payment method attached to different customer, detaching", { pmId, oldCustomer: pm.customer });
              try {
                await stripe.paymentMethods.detach(pmId);
                await stripe.paymentMethods.attach(pmId, { customer: customerId });
                paymentMethodId = pmId;
                logStep("Payment method reattached to correct customer", { pmId });
              } catch (detachErr: any) {
                logStep("Could not reattach payment method", { error: detachErr.message });
              }
            }
            
            if (paymentMethodId) {
              await stripe.customers.update(customerId, {
                invoice_settings: { default_payment_method: paymentMethodId },
              });
              logStep("Set default payment method on customer", { customerId, paymentMethodId });
            }
          } catch (pmErr: any) {
            logStep("Payment method handling note", { message: pmErr.message });
          }
        }
        
        // If no payment method from payment intent, list customer's payment methods
        if (!paymentMethodId) {
          try {
            const customerPMs = await stripe.paymentMethods.list({
              customer: customerId,
              type: 'card',
              limit: 1,
            });
            if (customerPMs.data.length > 0) {
              paymentMethodId = customerPMs.data[0].id;
              await stripe.customers.update(customerId, {
                invoice_settings: { default_payment_method: paymentMethodId },
              });
              logStep("Found existing payment method on customer", { paymentMethodId });
            }
          } catch (e) {
            logStep("Could not list customer payment methods");
          }
        }
        
        // Create or get recurring price in Stripe using the geo-pricing currency
        // detail.amount is already the geo-adjusted price
        const geoCurrency = paymentCurrency.toLowerCase();
        const priceAmount = Math.round((detail.amount || productInfo.base_price_usd || 0) * 100);
        const lookupKey = `sub_${detail.id}_${stripeInterval}_${geoCurrency}`;
        
        const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
        let priceId: string;
        
        if (prices.data.length > 0) {
          priceId = prices.data[0].id;
          logStep("Existing Stripe price found", { priceId, currency: geoCurrency });
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
            currency: geoCurrency,
            recurring: { interval: stripeInterval },
            lookup_key: lookupKey,
          });
          priceId = newPrice.id;
          logStep("Created Stripe price", { priceId, interval: stripeInterval, currency: geoCurrency, amount: priceAmount });
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

        // Apply recurring coupon discount to the Stripe subscription (so renewals are discounted too)
        let recurringDiscountAmount: number | null = null;
        if (subscriptionCoupon) {
          subscriptionParams.discounts = [{ coupon: subscriptionCoupon.stripeCouponId }];

          const base = Number(productInfo.base_price_usd || 0);
          if (subscriptionCoupon.discount_type === 'percentage' && subscriptionCoupon.percent_off) {
            recurringDiscountAmount = Math.min(base * (subscriptionCoupon.percent_off / 100), base);
          } else if (subscriptionCoupon.discount_type === 'fixed' && subscriptionCoupon.amount_off) {
            recurringDiscountAmount = Math.min(subscriptionCoupon.amount_off, base);
          }

          logStep('Applied subscription discount', {
            code: subscriptionCoupon.code,
            stripeCouponId: subscriptionCoupon.stripeCouponId,
            recurringDiscountAmount,
          });
        }

        let stripeSubscription = await stripe.subscriptions.create(subscriptionParams);

        // Stripe sometimes shows the discount as "applied" but doesn't affect the upcoming renewal amount
        // until a follow-up update. To make this deterministic, we always re-apply the discount after create.
        if (subscriptionCoupon) {
          try {
            stripeSubscription = await stripe.subscriptions.update(stripeSubscription.id, {
              discounts: [{ coupon: subscriptionCoupon.stripeCouponId }],
              proration_behavior: 'none',
            });
            logStep('Ensured subscription discount is applied', {
              stripeSubId: stripeSubscription.id,
              stripeCouponId: subscriptionCoupon.stripeCouponId,
            });
          } catch (ensureErr: any) {
            logStep('Ensure discount failed (non-fatal)', { message: ensureErr?.message || String(ensureErr) });
          }
        }

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

        // Create the subscription record - use geo-adjusted amount, not base_price_usd
        const geoAdjustedAmount = detail.amount || productInfo.base_price_usd;
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
            amount: geoAdjustedAmount,
            currency: paymentCurrency,
            interval: billingInterval,
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            trial_end: trialEndDate?.toISOString() || null,
            trial_ends_at: trialEndDate?.toISOString() || null,
            coupon_code: subscriptionCoupon ? subscriptionCoupon.code : null,
            coupon_discount: recurringDiscountAmount,
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
    
    // Get actual Stripe fee from the payment intent's charge
    let actualStripeFee = 0;
    try {
      if (paymentIntent.latest_charge) {
        const chargeId = typeof paymentIntent.latest_charge === 'string' 
          ? paymentIntent.latest_charge 
          : paymentIntent.latest_charge.id;
        const charge = await stripe.charges.retrieve(chargeId);
        
        if (charge.balance_transaction) {
          const btId = typeof charge.balance_transaction === 'string'
            ? charge.balance_transaction
            : charge.balance_transaction.id;
          const balanceTransaction = await stripe.balanceTransactions.retrieve(btId);
          actualStripeFee = balanceTransaction.fee / 100; // Convert from cents
          logStep("Retrieved actual Stripe fee", { fee: actualStripeFee, currency: balanceTransaction.currency });
        }
      }
    } catch (feeErr: any) {
      logStep("Could not retrieve Stripe fee", { error: feeErr.message });
    }

    // Create order records for EACH product with proportional fee distribution
    for (const detail of productDetailsList) {
      try {
        const productInfo = productsMap.get(detail.id);

        // Skip creating order record for subscriptions/memberships in trial period
        // Sales records for these will be created by the stripe-webhook when the first real charge occurs
        if (productInfo && (productInfo.product_type === 'subscription' || productInfo.product_type === 'membership')) {
          if (productInfo.trial_enabled && productInfo.trial_length_days && productInfo.trial_length_days > 0) {
            logStep("Skipping order creation for trial subscription", { productId: detail.id, trialDays: productInfo.trial_length_days });
            continue;
          }
        }

        const discountedAmount = detail.amount * discountRatio;
        const subscriptionId = subscriptionIdsByProduct.get(detail.id) || null;
        
        // Calculate proportional fee for this product
        const proportion = totalOriginalAmount > 0 ? detail.amount / totalOriginalAmount : 1 / productDetailsList.length;
        const proportionalFee = actualStripeFee * proportion;
        const proportionalCouponDiscount = parseFloat(coupon_discount || '0') * proportion;
        const netAmount = discountedAmount - proportionalFee;
        
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
            coupon_code: coupon_code || null,
            coupon_discount: proportionalCouponDiscount,
            stripe_fee: proportionalFee,
            net_amount: netAmount,
          });

        if (orderError) {
          logStep("Order creation error", { error: orderError });
        } else {
          logStep("Order created for product", { productId: detail.id, amount: discountedAmount, fee: proportionalFee, net: netAmount, subscriptionId });
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

    // Send order confirmation email
    try {
      // Get first name from profile
      const { data: userProfile } = await supabaseClient
        .from('profiles')
        .select('first_name')
        .eq('id', userId)
        .single();

      const orderItems = productDetailsList.map(p => ({
        name: p.name,
        amount: p.amount * discountRatio,
      }));

      const hasSubscription = productDetailsList.some(p => {
        const prod = productsMap.get(p.id);
        return prod?.product_type === 'membership' || prod?.product_type === 'subscription';
      });

      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-order-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          email,
          firstName: userProfile?.first_name || full_name?.split(' ')[0] || '',
          orderItems,
          totalAmount: paymentIntent.amount / 100,
          currency: paymentCurrency,
          isSubscription: hasSubscription,
        }),
      });

      if (response.ok) {
        logStep("Order confirmation email sent");
      } else {
        logStep("Order confirmation email failed (non-fatal)", { status: response.status });
      }
    } catch (emailError) {
      logStep("Order confirmation email error (non-fatal)", { error: emailError });
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
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
