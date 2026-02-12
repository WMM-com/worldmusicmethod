import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getStripeSecretKey } from "../_shared/stripe-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[MANAGE-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : '');
};

// PayPal API base URL - use sandbox for testing, production for live
// Check if PAYPAL_SANDBOX env var is set, or infer from Stripe key prefix
const getPayPalBaseUrl = () => {
  const useSandbox = Deno.env.get("PAYPAL_SANDBOX") === "true" || 
    getStripeSecretKey()?.startsWith("sk_test_");
  return useSandbox 
    ? "https://api-m.sandbox.paypal.com" 
    : "https://api-m.paypal.com";
};

const unixSecondsToIso = (unixSeconds: unknown): string | null => {
  const n = Number(unixSeconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    return new Date(n * 1000).toISOString();
  } catch {
    return null;
  }
};

const isoFromDateLike = (value: unknown): string | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, subscriptionId, data } = await req.json();

    logStep("Action requested", { action, subscriptionId });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: actorData, error: actorError } = await supabaseClient.auth.getUser(token);
    if (actorError || !actorData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const actor = actorData.user;

    // Get subscription from database
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single();

    if (subError || !subscription) {
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const { data: isAdmin } = await supabaseClient.rpc("has_role", {
      _user_id: actor.id,
      _role: "admin",
    });

    const canManage = isAdmin === true || actor.id === subscription.user_id;
    if (!canManage) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    logStep("Subscription found", {
      provider: subscription.payment_provider,
      providerId: subscription.provider_subscription_id,
      actorId: actor.id,
      isAdmin: isAdmin === true,
    });

    if (subscription.payment_provider === 'stripe') {
      const stripe = new Stripe(getStripeSecretKey(), {
        apiVersion: "2025-08-27.basil",
      });

      // Some legacy flows store a PaymentIntent id (pi_) instead of a Subscription id (sub_).
      // In that case, Stripe subscription management actions cannot work.
      if (typeof subscription.provider_subscription_id === 'string' && subscription.provider_subscription_id.startsWith('pi_')) {
        return new Response(
          JSON.stringify({
            error:
              "This record isn't linked to a Stripe subscription (missing sub_ id). It was created via one-time payment, so pause/cancel/price changes aren't supported. Please re-create the subscription using the subscription checkout flow.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      let result: any;

      switch (action) {
        case 'cancel': {
          // Cancel at end of billing period (pending cancellation)
          const canceledSub = await stripe.subscriptions.update(
            subscription.provider_subscription_id,
            { cancel_at_period_end: true }
          );

          logStep("Stripe cancel_at_period_end applied", {
            current_period_end: canceledSub.current_period_end,
            trial_end: canceledSub.trial_end,
            cancel_at: canceledSub.cancel_at,
          });

          const cancelsAtIso =
            unixSecondsToIso(canceledSub.cancel_at) ??
            unixSecondsToIso(canceledSub.current_period_end) ??
            unixSecondsToIso(canceledSub.trial_end);

          const currentPeriodEndIso =
            unixSecondsToIso(canceledSub.current_period_end) ??
            unixSecondsToIso(canceledSub.trial_end) ??
            cancelsAtIso ??
            null;

          await supabaseClient
            .from('subscriptions')
            .update({
              status: 'pending_cancellation',
              cancels_at: cancelsAtIso,
              current_period_end: currentPeriodEndIso ?? subscription.current_period_end,
            })
            .eq('id', subscriptionId);

          result = {
            status: 'pending_cancellation',
            cancels_at: cancelsAtIso,
          };
          logStep("Subscription set to cancel at period end", { cancels_at: cancelsAtIso });
          break;
        }

        case 'cancel_immediately': {
          const canceledSub = await stripe.subscriptions.cancel(
            subscription.provider_subscription_id
          );
          
          await supabaseClient
            .from('subscriptions')
            .update({ 
              status: 'cancelled', 
              cancelled_at: new Date().toISOString() 
            })
            .eq('id', subscriptionId);

          // Revoke product access
          const { data: subItems } = await supabaseClient
            .from('subscription_items')
            .select('course_id, product_id')
            .eq('subscription_product_id', subscription.product_id);

          if (subItems && subscription.user_id) {
            for (const item of subItems) {
              if (item.course_id) {
                await supabaseClient
                  .from('course_enrollments')
                  .update({ is_active: false })
                  .match({ user_id: subscription.user_id, course_id: item.course_id });
              }
            }
          }

          result = { status: 'cancelled' };
          logStep("Subscription cancelled immediately");
          break;
        }

        case 'reactivate': {
          // Reactivate a pending cancellation subscription
          const reactivatedSub = await stripe.subscriptions.update(
            subscription.provider_subscription_id,
            { cancel_at_period_end: false }
          );
          
          await supabaseClient
            .from('subscriptions')
            .update({ 
              status: 'active', 
              cancels_at: null
            })
            .eq('id', subscriptionId);

          result = { status: 'active' };
          logStep("Subscription reactivated");
          break;
        }

        case 'pause': {
          const pausedSub = await stripe.subscriptions.update(
            subscription.provider_subscription_id,
            { pause_collection: { behavior: 'void' } }
          );

          await supabaseClient
            .from('subscriptions')
            .update({ 
              status: 'paused', 
              paused_at: new Date().toISOString() 
            })
            .eq('id', subscriptionId);

          result = { status: 'paused' };
          logStep("Subscription paused");
          break;
        }

        case 'resume': {
          const resumedSub = await stripe.subscriptions.update(
            subscription.provider_subscription_id,
            { pause_collection: '' }
          );

          await supabaseClient
            .from('subscriptions')
            .update({ 
              status: 'active', 
              paused_at: null 
            })
            .eq('id', subscriptionId);

          result = { status: 'active' };
          logStep("Subscription resumed");
          break;
        }

        case 'update_price': {
          const { newAmount, currency, interval } = data;
          
          // Get current subscription
          const stripeSub = await stripe.subscriptions.retrieve(
            subscription.provider_subscription_id
          );
          
          const currentItem = stripeSub.items.data[0];
          const currentPrice = await stripe.prices.retrieve(currentItem.price.id);
          
          // Use subscription's currency, fallback to current price currency, then USD
          const subscriptionCurrency = (currency || subscription.currency || currentPrice.currency || 'usd').toLowerCase();
          
          // Map database interval to Stripe interval
          const intervalMap: Record<string, 'day' | 'week' | 'month' | 'year'> = {
            'daily': 'day',
            'weekly': 'week',
            'monthly': 'month',
            'yearly': 'year',
            'annual': 'year',
          };
          const dbInterval = interval || subscription.interval || 'monthly';
          const stripeInterval = intervalMap[dbInterval] || currentPrice.recurring?.interval || 'month';
          
          // Create new price with correct currency and interval
          const newPrice = await stripe.prices.create({
            product: currentPrice.product as string,
            unit_amount: Math.round(newAmount * 100),
            currency: subscriptionCurrency,
            recurring: { interval: stripeInterval },
          });

          // Update subscription with new price
          await stripe.subscriptions.update(
            subscription.provider_subscription_id,
            {
              items: [{
                id: currentItem.id,
                price: newPrice.id,
              }],
              proration_behavior: 'none',
            }
          );

          await supabaseClient
            .from('subscriptions')
            .update({ amount: newAmount })
            .eq('id', subscriptionId);

          result = { newAmount, currency: subscriptionCurrency, interval: stripeInterval };
          logStep("Stripe price updated", { newAmount, currency: subscriptionCurrency, interval: stripeInterval });
          break;
        }

        case 'apply_coupon': {
          const { couponCode } = data;

          // Look up coupon in database
          const { data: couponData, error: couponError } = await supabaseClient
            .from('coupons')
            .select('*')
            .ilike('code', couponCode.trim())
            .eq('is_active', true)
            .single();

          if (couponError || !couponData) {
            throw new Error('Invalid or inactive coupon code');
          }

          // Check if coupon applies to subscriptions
          if (!couponData.applies_to_subscriptions) {
            throw new Error('This coupon does not apply to subscriptions');
          }

          // Check max redemptions
          if (couponData.max_redemptions && couponData.times_redeemed >= couponData.max_redemptions) {
            throw new Error('This coupon has reached its maximum redemptions');
          }

          // Check validity dates
          const now = new Date();
          if (couponData.valid_from && new Date(couponData.valid_from) > now) {
            throw new Error('This coupon is not yet valid');
          }
          if (couponData.valid_until && new Date(couponData.valid_until) < now) {
            throw new Error('This coupon has expired');
          }

          // Get or create Stripe coupon once (re-use via coupons.stripe_coupon_id)
          let stripeCouponId: string | null = couponData.stripe_coupon_id;

          if (!stripeCouponId) {
            const stripeCouponParams: Stripe.CouponCreateParams = {
              name: couponData.name || couponData.code,
              duration: couponData.duration as 'once' | 'repeating' | 'forever',
            };

            if (couponData.duration === 'repeating' && couponData.duration_in_months) {
              stripeCouponParams.duration_in_months = couponData.duration_in_months;
            }

            if (couponData.discount_type === 'percentage' && couponData.percent_off) {
              stripeCouponParams.percent_off = couponData.percent_off;
            } else if (couponData.discount_type === 'fixed' && couponData.amount_off) {
              stripeCouponParams.amount_off = Math.round(couponData.amount_off * 100);
              stripeCouponParams.currency = (couponData.currency || 'USD').toLowerCase();
            }

            const stripeCoupon = await stripe.coupons.create(stripeCouponParams);
            stripeCouponId = stripeCoupon.id;

            await supabaseClient
              .from('coupons')
              .update({ stripe_coupon_id: stripeCouponId })
              .eq('id', couponData.id);

            logStep('Stripe coupon created', { code: couponData.code, stripeCouponId });
          }

          if (!stripeCouponId) {
            throw new Error('Failed to prepare coupon');
          }

          // Basil API versions use discounts[] (coupon/promotion_code removed)
          await stripe.subscriptions.update(subscription.provider_subscription_id, {
            discounts: [{ coupon: stripeCouponId }],
          });

          // Store coupon discount as an amount-per-period for display
          const baseAmount = Number(subscription.amount || 0);
          let discountAmount = 0;
          if (couponData.discount_type === 'percentage' && couponData.percent_off) {
            discountAmount = Math.min(baseAmount * (couponData.percent_off / 100), baseAmount);
          } else if (couponData.discount_type === 'fixed' && couponData.amount_off) {
            discountAmount = Math.min(couponData.amount_off, baseAmount);
          }

          await supabaseClient
            .from('subscriptions')
            .update({
              coupon_code: couponData.code,
              coupon_discount: discountAmount,
            })
            .eq('id', subscriptionId);

          // Increment times_redeemed
          await supabaseClient
            .from('coupons')
            .update({ times_redeemed: (couponData.times_redeemed || 0) + 1 })
            .eq('id', couponData.id);

          result = {
            couponApplied: couponData.code,
            discountType: couponData.discount_type,
            discountAmount,
          };
          logStep('Coupon applied', { couponCode: couponData.code, stripeCouponId, discountAmount });
          break;
        }

        case 'remove_coupon': {
          try {
            await stripe.subscriptions.deleteDiscount(subscription.provider_subscription_id);
          } catch (e) {
            // If there's no discount, Stripe may error; ignore.
            logStep('deleteDiscount note', { message: String(e) });
          }

          await supabaseClient
            .from('subscriptions')
            .update({
              coupon_code: null,
              coupon_discount: null,
            })
            .eq('id', subscriptionId);

          result = { couponRemoved: true };
          logStep('Coupon removed');
          break;
        }

        case 'update_payment_method': {
          const stripeSub = await stripe.subscriptions.retrieve(
            subscription.provider_subscription_id
          );
          
          const customerId = stripeSub.customer as string;
          
          // If a payment method ID is provided, attach it and set as default
          if (data?.paymentMethodId) {
            // Attach payment method to customer
            await stripe.paymentMethods.attach(data.paymentMethodId, {
              customer: customerId,
            });
            
            // Set as default payment method for subscription
            await stripe.subscriptions.update(subscription.provider_subscription_id, {
              default_payment_method: data.paymentMethodId,
            });
            
            // Also update customer's default for future invoices
            await stripe.customers.update(customerId, {
              invoice_settings: {
                default_payment_method: data.paymentMethodId,
              },
            });
            
            // Update local subscription record to reflect Stripe provider
            await supabaseClient
              .from('subscriptions')
              .update({ payment_provider: 'stripe' })
              .eq('id', subscriptionId);
            
            result = { success: true, paymentMethodUpdated: true };
            logStep('Payment method updated directly', { paymentMethodId: data.paymentMethodId });
          } else {
            // Fallback to portal session
            const origin = data?.returnUrl || Deno.env.get("SITE_URL") || Deno.env.get("FRONTEND_URL") || "https://worldmusicmethod.com";
            
            const portalSession = await stripe.billingPortal.sessions.create({
              customer: customerId,
              return_url: `${origin}/account`,
              flow_data: {
                type: 'payment_method_update',
              },
            });
            
            result = { url: portalSession.url };
            logStep('Customer portal session created for payment method update', { url: portalSession.url });
          }
          break;
        }

        case 'update_paypal_payment': {
          // This action is for PayPal subscriptions but was called on a Stripe subscription
          // Redirect to update_payment_method logic
          const stripeSub = await stripe.subscriptions.retrieve(
            subscription.provider_subscription_id
          );
          
          const customerId = stripeSub.customer as string;
          const origin = data?.returnUrl || Deno.env.get("SITE_URL") || Deno.env.get("FRONTEND_URL") || "https://worldmusicmethod.com";
          
          const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/account`,
            flow_data: {
              type: 'payment_method_update',
            },
          });
          
          return new Response(
            JSON.stringify({ success: true, url: portalSession.url }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        case 'switch_to_paypal': {
          // Switch from Stripe to PayPal subscription
          // 1. Cancel the Stripe subscription at period end
          // 2. Return a PayPal plan approval URL for the user to confirm
          const { returnUrl } = data || {};
          
          logStep("Switching from Stripe to PayPal", { subscriptionId });
          
          // Get product info
          const { data: product } = await supabaseClient
            .from('products')
            .select('*')
            .eq('id', subscription.product_id)
            .single();
          
          if (!product) {
            throw new Error('Product not found');
          }
          
          // Get PayPal access token
          const ppClientId = Deno.env.get("PAYPAL_CLIENT_ID");
          const ppClientSecret = Deno.env.get("PAYPAL_SECRET");
          
          if (!ppClientId || !ppClientSecret) {
            throw new Error('PayPal is not configured');
          }
          
          const ppAuth = btoa(`${ppClientId}:${ppClientSecret}`);
          const ppTokenResponse = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${ppAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          });
          
          const { access_token: ppAccessToken } = await ppTokenResponse.json();
          
          // Create PayPal product
          const ppProductResponse = await fetch(`${getPayPalBaseUrl()}/v1/catalogs/products`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${ppAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: product.name,
              type: "SERVICE",
              category: "EDUCATIONAL_AND_TEXTBOOKS",
            }),
          });
          
          const ppProduct = await ppProductResponse.json();
          logStep("PayPal product created", { productId: ppProduct.id });
          
          // Map interval to PayPal
          const paypalIntervalMap: Record<string, { interval_unit: string; interval_count: number }> = {
            'daily': { interval_unit: 'DAY', interval_count: 1 },
            'weekly': { interval_unit: 'WEEK', interval_count: 1 },
            'monthly': { interval_unit: 'MONTH', interval_count: 1 },
            'annual': { interval_unit: 'YEAR', interval_count: 1 },
            'yearly': { interval_unit: 'YEAR', interval_count: 1 },
          };
          const ppInterval = paypalIntervalMap[subscription.interval || 'monthly'];
          
          const currencyCode = (subscription.currency || 'USD').toUpperCase();
          const amount = subscription.amount || product.base_price_usd || 0;
          
          // Create billing plan
          const planPayload: any = {
            product_id: ppProduct.id,
            name: `${product.name} - ${subscription.interval || 'monthly'}`,
            billing_cycles: [
              {
                frequency: {
                  interval_unit: ppInterval.interval_unit,
                  interval_count: ppInterval.interval_count,
                },
                tenure_type: "REGULAR",
                sequence: 1,
                total_cycles: 0,
                pricing_scheme: {
                  fixed_price: {
                    value: amount.toFixed(2),
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
          
          const planResponse = await fetch(`${getPayPalBaseUrl()}/v1/billing/plans`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${ppAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(planPayload),
          });
          
          if (!planResponse.ok) {
            const planError = await planResponse.text();
            logStep("PayPal plan creation failed", { error: planError });
            throw new Error(`PayPal plan creation failed: ${planError}`);
          }
          
          const plan = await planResponse.json();
          logStep("PayPal plan created", { planId: plan.id });
          
          // Get user info
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('email, full_name')
            .eq('id', subscription.user_id)
            .single();
          
          const email = profile?.email || subscription.customer_email;
          const fullName = profile?.full_name || subscription.customer_name || '';
          
          // Create PayPal subscription
          const origin = returnUrl || Deno.env.get("SITE_URL") || Deno.env.get("FRONTEND_URL") || "https://worldmusicmethod.com";
          
          const ppSubscriptionPayload = {
            plan_id: plan.id,
            subscriber: {
              name: { 
                given_name: fullName.split(' ')[0] || '', 
                surname: fullName.split(' ').slice(1).join(' ') || '' 
              },
              email_address: email,
            },
            application_context: {
              brand_name: "World Music Method",
              return_url: `${origin}/account?paypal_switch=success&sub_id=${subscriptionId}`,
              cancel_url: `${origin}/account?paypal_switch=cancelled`,
            },
          };
          
          const ppSubResponse = await fetch(`${getPayPalBaseUrl()}/v1/billing/subscriptions`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${ppAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(ppSubscriptionPayload),
          });
          
          if (!ppSubResponse.ok) {
            const subError = await ppSubResponse.text();
            logStep("PayPal subscription creation failed", { error: subError });
            throw new Error(`PayPal subscription creation failed: ${subError}`);
          }
          
          const ppSubscription = await ppSubResponse.json();
          const approveUrl = ppSubscription.links?.find((l: any) => l.rel === "approve")?.href;
          
          if (!approveUrl) {
            throw new Error("PayPal did not return an approval URL");
          }
          
          logStep("PayPal subscription created, awaiting approval", { 
            ppSubId: ppSubscription.id, 
            approveUrl 
          });
          
          // Store the pending PayPal subscription ID for later activation
          // We'll complete the switch when the user returns from PayPal
          await supabaseClient
            .from('subscriptions')
            .update({ 
              pending_paypal_subscription_id: ppSubscription.id 
            })
            .eq('id', subscriptionId);
          
          result = { 
            success: true,
            requiresApproval: true,
            approveUrl,
            pendingPayPalSubscriptionId: ppSubscription.id,
          };
          break;
        }

        case 'confirm_paypal_switch': {
          // Confirm the switch from Stripe to PayPal after user approves in PayPal
          const { pendingPayPalSubscriptionId } = data || {};
          const ppSubIdToActivate = pendingPayPalSubscriptionId || subscription.pending_paypal_subscription_id;
          
          if (!ppSubIdToActivate) {
            throw new Error('No pending PayPal subscription found');
          }
          
          logStep("Confirming Stripe to PayPal switch", { ppSubIdToActivate });
          
          // Get PayPal access token
          const ppClientId = Deno.env.get("PAYPAL_CLIENT_ID");
          const ppClientSecret = Deno.env.get("PAYPAL_SECRET");
          const ppAuth = btoa(`${ppClientId}:${ppClientSecret}`);
          
          const ppTokenResponse = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${ppAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          });
          
          const { access_token: ppAccessToken } = await ppTokenResponse.json();
          
          // Check PayPal subscription status
          const ppSubResponse = await fetch(
            `${getPayPalBaseUrl()}/v1/billing/subscriptions/${ppSubIdToActivate}`,
            {
              headers: {
                "Authorization": `Bearer ${ppAccessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          
          const ppSub = await ppSubResponse.json();
          logStep("PayPal subscription status", { status: ppSub.status });
          
          if (ppSub.status !== 'ACTIVE' && ppSub.status !== 'APPROVAL_PENDING') {
            throw new Error(`PayPal subscription not ready: ${ppSub.status}`);
          }
          
          // If still pending approval, user hasn't completed PayPal flow
          if (ppSub.status === 'APPROVAL_PENDING') {
            const approveUrl = ppSub.links?.find((l: any) => l.rel === "approve")?.href;
            result = { 
              success: false,
              requiresApproval: true,
              approveUrl,
              message: 'Please complete the PayPal approval first'
            };
            break;
          }
          
          // PayPal subscription is active - cancel Stripe and update DB
          // Cancel Stripe subscription
          await stripe.subscriptions.cancel(subscription.provider_subscription_id);
          logStep("Stripe subscription cancelled");
          
          // Get billing info from PayPal subscription
          const billingInfo = ppSub.billing_info;
          const nextBilling = billingInfo?.next_billing_time 
            ? new Date(billingInfo.next_billing_time).toISOString() 
            : null;
          
          // Update subscription record
          await supabaseClient
            .from('subscriptions')
            .update({
              payment_provider: 'paypal',
              provider_subscription_id: ppSubIdToActivate,
              status: 'active',
              pending_paypal_subscription_id: null,
              current_period_end: nextBilling || subscription.current_period_end,
              cancels_at: null,
              paused_at: null,
            })
            .eq('id', subscriptionId);
          
          result = { 
            success: true, 
            switched: true, 
            newProvider: 'paypal',
            paypalSubscriptionId: ppSubIdToActivate 
          };
          logStep("Switch to PayPal confirmed", { ppSubId: ppSubIdToActivate });
          break;
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (subscription.payment_provider === 'paypal') {
      const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
      const clientSecret = Deno.env.get("PAYPAL_SECRET");
      const auth = btoa(`${clientId}:${clientSecret}`);

      const tokenResponse = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      const { access_token } = await tokenResponse.json();

      let result: any;

      switch (action) {
        case 'cancel': {
          // For PayPal, we'll cancel immediately but track it as pending
          // PayPal doesn't have native "cancel at period end"
          await fetch(
            `${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscription.provider_subscription_id}/cancel`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ reason: "Customer requested cancellation" }),
            }
          );

          // Mark as pending cancellation if there's remaining time
          const now = new Date();
          const parsedPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
          const periodEnd = parsedPeriodEnd && !Number.isNaN(parsedPeriodEnd.getTime()) ? parsedPeriodEnd : now;

          if (periodEnd > now) {
            await supabaseClient
              .from('subscriptions')
              .update({ 
                status: 'pending_cancellation', 
                cancels_at: periodEnd.toISOString()
              })
              .eq('id', subscriptionId);
            result = { status: 'pending_cancellation', cancels_at: periodEnd.toISOString() };
          } else {
            await supabaseClient
              .from('subscriptions')
              .update({ 
                status: 'cancelled', 
                cancelled_at: new Date().toISOString() 
              })
              .eq('id', subscriptionId);
            result = { status: 'cancelled' };
          }

          logStep("PayPal subscription cancelled");
          break;
        }

        case 'pause': {
          await fetch(
            `${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscription.provider_subscription_id}/suspend`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ reason: "Customer requested pause" }),
            }
          );

          await supabaseClient
            .from('subscriptions')
            .update({ 
              status: 'paused', 
              paused_at: new Date().toISOString() 
            })
            .eq('id', subscriptionId);

          result = { status: 'paused' };
          logStep("PayPal subscription paused");
          break;
        }

        case 'resume': {
          await fetch(
            `${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscription.provider_subscription_id}/activate`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ reason: "Customer requested resume" }),
            }
          );

          await supabaseClient
            .from('subscriptions')
            .update({ 
              status: 'active', 
              paused_at: null 
            })
            .eq('id', subscriptionId);

          result = { status: 'active' };
          logStep("PayPal subscription resumed");
          break;
        }

        case 'cancel_immediately': {
          await fetch(
            `${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscription.provider_subscription_id}/cancel`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ reason: "Immediate cancellation requested" }),
            }
          );

          await supabaseClient
            .from('subscriptions')
            .update({ 
              status: 'cancelled', 
              cancelled_at: new Date().toISOString() 
            })
            .eq('id', subscriptionId);

          // Revoke product access
          const { data: subItems } = await supabaseClient
            .from('subscription_items')
            .select('course_id, product_id')
            .eq('subscription_product_id', subscription.product_id);

          if (subItems && subscription.user_id) {
            for (const item of subItems) {
              if (item.course_id) {
                await supabaseClient
                  .from('course_enrollments')
                  .update({ is_active: false })
                  .match({ user_id: subscription.user_id, course_id: item.course_id });
              }
            }
          }

          result = { status: 'cancelled' };
          logStep("PayPal subscription cancelled immediately");
          break;
        }

        case 'reactivate': {
          // PayPal doesn't support reactivating cancelled subscriptions
          // But we can reactivate suspended ones
          await fetch(
            `${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscription.provider_subscription_id}/activate`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ reason: "Customer requested reactivation" }),
            }
          );
          
          await supabaseClient
            .from('subscriptions')
            .update({ 
              status: 'active', 
              cancels_at: null
            })
            .eq('id', subscriptionId);

          result = { status: 'active' };
          logStep("PayPal subscription reactivated");
          break;
        }

        case 'update_price': {
          // PayPal requires creating a new plan with the new price and revising the subscription
          const { newAmount, currency, interval } = data;
          const subscriptionCurrency = (currency || subscription.currency || 'USD').toUpperCase();
          
          // First, get the current subscription to find the product_id from the plan
          const subDetailsResponse = await fetch(
            `${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscription.provider_subscription_id}`,
            {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
            }
          );
          
          if (!subDetailsResponse.ok) {
            throw new Error("Failed to get PayPal subscription details");
          }
          
          const subDetails = await subDetailsResponse.json();
          const currentPlanId = subDetails.plan_id;
          
          // Get the current plan to find the product_id
          const planDetailsResponse = await fetch(
            `${getPayPalBaseUrl()}/v1/billing/plans/${currentPlanId}`,
            {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
            }
          );
          
          if (!planDetailsResponse.ok) {
            throw new Error("Failed to get PayPal plan details");
          }
          
          const planDetails = await planDetailsResponse.json();
          const productId = planDetails.product_id;
          
          logStep("PayPal current plan details", { currentPlanId, productId, planDetails });
          
          // Map interval to PayPal format
          const paypalIntervalMap: Record<string, { interval_unit: string; interval_count: number }> = {
            'daily': { interval_unit: 'DAY', interval_count: 1 },
            'weekly': { interval_unit: 'WEEK', interval_count: 1 },
            'monthly': { interval_unit: 'MONTH', interval_count: 1 },
            'annual': { interval_unit: 'YEAR', interval_count: 1 },
            'yearly': { interval_unit: 'YEAR', interval_count: 1 },
          };
          
          const paypalInterval = paypalIntervalMap[interval || subscription.interval || 'monthly'] || { interval_unit: 'MONTH', interval_count: 1 };
          
          // Create a new plan with the updated price
          const newPlanPayload = {
            product_id: productId,
            name: `${subscription.product_name || 'Subscription'} - Updated ${new Date().toISOString().split('T')[0]}`,
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
                    value: newAmount.toFixed(2),
                    currency_code: subscriptionCurrency,
                  },
                },
              },
            ],
            payment_preferences: {
              auto_bill_outstanding: true,
              payment_failure_threshold: 3,
            },
          };
          
          const newPlanResponse = await fetch(`${getPayPalBaseUrl()}/v1/billing/plans`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newPlanPayload),
          });
          
          if (!newPlanResponse.ok) {
            const errorText = await newPlanResponse.text();
            logStep("PayPal new plan creation failed", { error: errorText });
            throw new Error(`Failed to create new PayPal plan: ${errorText}`);
          }
          
          const newPlan = await newPlanResponse.json();
          logStep("PayPal new plan created", { newPlanId: newPlan.id });
          
          // Revise the subscription to use the new plan
          const reviseResponse = await fetch(
            `${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscription.provider_subscription_id}/revise`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                plan_id: newPlan.id,
              }),
            }
          );
          
          if (!reviseResponse.ok) {
            const errorText = await reviseResponse.text();
            logStep("PayPal subscription revision failed", { error: errorText });
            throw new Error(`Failed to revise PayPal subscription: ${errorText}`);
          }
          
          const reviseResult = await reviseResponse.json();
          logStep("PayPal subscription revised", { reviseResult });
          
          // Check if customer approval is needed (for PayPal wallet payments)
          const approveLink = reviseResult.links?.find((link: any) => link.rel === 'approve');
          
          // Update database with new amount
          await supabaseClient
            .from('subscriptions')
            .update({ amount: newAmount })
            .eq('id', subscriptionId);
          
          if (approveLink) {
            result = { 
              newAmount, 
              currency: subscriptionCurrency,
              approvalUrl: approveLink.href,
              note: 'Customer must approve the price change via PayPal.' 
            };
            logStep("PayPal revision requires customer approval", { approvalUrl: approveLink.href });
          } else {
            result = { 
              newAmount, 
              currency: subscriptionCurrency,
              note: 'Price updated successfully. Will take effect on next billing cycle.' 
            };
            logStep("PayPal subscription price updated directly", { newAmount, currency: subscriptionCurrency });
          }
          break;
        }

        case 'apply_coupon': {
          const { couponCode } = data;
          
          // Look up coupon in database
          const { data: couponData, error: couponError } = await supabaseClient
            .from('coupons')
            .select('*')
            .ilike('code', couponCode)
            .eq('is_active', true)
            .single();

          if (couponError || !couponData) {
            throw new Error('Invalid or inactive coupon code');
          }

          // Check if coupon applies to subscriptions
          if (couponData.applies_to_subscriptions === false) {
            throw new Error('This coupon does not apply to subscriptions');
          }

          // Check max redemptions
          if (couponData.max_redemptions && couponData.times_redeemed >= couponData.max_redemptions) {
            throw new Error('This coupon has reached its maximum redemptions');
          }

          // Check validity dates
          const now = new Date();
          if (couponData.valid_from && new Date(couponData.valid_from) > now) {
            throw new Error('This coupon is not yet valid');
          }
          if (couponData.valid_until && new Date(couponData.valid_until) < now) {
            throw new Error('This coupon has expired');
          }

          const discountValue = couponData.discount_type === 'percentage' 
            ? couponData.percent_off 
            : couponData.amount_off;

          // Update subscription in database
          await supabaseClient
            .from('subscriptions')
            .update({ 
              coupon_code: couponCode.toUpperCase(), 
              coupon_discount: discountValue 
            })
            .eq('id', subscriptionId);

          // Increment times_redeemed
          await supabaseClient
            .from('coupons')
            .update({ times_redeemed: couponData.times_redeemed + 1 })
            .eq('id', couponData.id);

          result = { 
            couponApplied: couponCode, 
            discountType: couponData.discount_type, 
            discount: discountValue,
            note: 'Coupon applied in database. PayPal does not support mid-cycle coupon changes.'
          };
          logStep("PayPal coupon applied in database", { couponCode });
          break;
        }

        case 'remove_coupon': {
          await supabaseClient
            .from('subscriptions')
            .update({ 
              coupon_code: null, 
              coupon_discount: null 
            })
            .eq('id', subscriptionId);

          result = { couponRemoved: true };
          logStep("PayPal coupon removed from database");
          break;
        }

        case 'update_payment_method':
        case 'update_paypal_payment': {
          // PayPal doesn't support updating payment methods via API directly
          // User needs to manage this through PayPal account
          // We can provide a link to PayPal subscription management
          const paypalSubId = subscription.provider_subscription_id;
          
          // PayPal subscription management URL
          const paypalManageUrl = `https://www.paypal.com/myaccount/autopay/connect/${paypalSubId}`;
          
          result = { 
            url: paypalManageUrl,
            message: 'Please update your payment method in your PayPal account'
          };
          logStep("PayPal payment update - redirecting to PayPal", { url: paypalManageUrl });
          break;
        }

        case 'switch_to_stripe': {
          // Switch from PayPal to Stripe subscription with proper 3DS/SCA handling
          // 1. Create Stripe subscription with incomplete status for 3DS
          // 2. Return client_secret for frontend confirmation
          // 3. Only cancel PayPal after frontend confirms successful payment

          const { paymentMethodId, confirmSwitch, stripeSubscriptionId: pendingStripeSubId } = data || {};
          
          // Phase 2: Confirm the switch after 3DS is complete
          if (confirmSwitch && pendingStripeSubId) {
            logStep("Confirming PayPal to Stripe switch", { pendingStripeSubId });
            
            const stripe = new Stripe(getStripeSecretKey(), {
              apiVersion: "2025-08-27.basil",
            });
            
            // Wait for Stripe to process the payment (it can take a moment after 3DS)
            let stripeSub = await stripe.subscriptions.retrieve(pendingStripeSubId);
            
            // If subscription is still incomplete, wait and retry a few times
            // The payment intent may have succeeded but subscription status may not have updated yet
            if (stripeSub.status === 'incomplete') {
              logStep("Subscription still incomplete, waiting for Stripe to process...");
              
              for (let attempt = 0; attempt < 5; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                stripeSub = await stripe.subscriptions.retrieve(pendingStripeSubId);
                
                if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
                  logStep("Subscription now active after wait", { status: stripeSub.status, attempt });
                  break;
                }
                
                logStep("Still waiting for subscription activation", { status: stripeSub.status, attempt });
              }
              
              // If still incomplete, check if invoice was paid
              if (stripeSub.status === 'incomplete' && stripeSub.latest_invoice) {
                const invoiceId = typeof stripeSub.latest_invoice === 'string' 
                  ? stripeSub.latest_invoice 
                  : stripeSub.latest_invoice.id;
                const invoice = await stripe.invoices.retrieve(invoiceId);
                
                if (invoice.status === 'paid') {
                  // Invoice is paid, manually activate the subscription if needed
                  logStep("Invoice paid, subscription should be active soon", { invoiceStatus: invoice.status });
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  stripeSub = await stripe.subscriptions.retrieve(pendingStripeSubId);
                }
              }
            }
            
            // Accept 'incomplete' if the payment was successful (Stripe webhook may not have processed yet)
            // We can check the latest invoice's payment intent status
            if (stripeSub.status === 'incomplete') {
              logStep("Subscription still incomplete, checking payment status...");
              
              if (stripeSub.latest_invoice) {
                const invoiceId = typeof stripeSub.latest_invoice === 'string' 
                  ? stripeSub.latest_invoice 
                  : stripeSub.latest_invoice.id;
                const invoice = await stripe.invoices.retrieve(invoiceId, { expand: ['payment_intent'] });
                const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent | null;
                
                if (paymentIntent?.status === 'succeeded') {
                  logStep("Payment intent succeeded, proceeding with switch despite incomplete status");
                  // Proceed anyway - the subscription will become active soon
                } else if (paymentIntent?.status === 'requires_action' || paymentIntent?.status === 'requires_confirmation') {
                  throw new Error(`Payment still requires action: ${paymentIntent.status}`);
                } else {
                  throw new Error(`Payment failed: ${paymentIntent?.status || 'unknown'}`);
                }
              }
            }
            
            // Now cancel the PayPal subscription
            const cancelResponse = await fetch(
              `${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscription.provider_subscription_id}/cancel`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${access_token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ reason: "Switched to card payment" }),
              }
            );

            if (!cancelResponse.ok) {
              const cancelError = await cancelResponse.text();
              logStep("Failed to cancel PayPal subscription (non-blocking)", { error: cancelError });
            } else {
              logStep("PayPal subscription cancelled successfully");
            }

            // Update the subscription record
            const currentPeriodEnd = unixSecondsToIso(stripeSub.current_period_end);
            const currentPeriodStart = unixSecondsToIso(stripeSub.current_period_start);
            const trialEndsAt = stripeSub.trial_end ? unixSecondsToIso(stripeSub.trial_end) : null;

            // Set status based on Stripe subscription status
            const newStatus = stripeSub.status === 'trialing' ? 'trialing' : 'active';

            await supabaseClient
              .from('subscriptions')
              .update({
                payment_provider: 'stripe',
                provider_subscription_id: pendingStripeSubId,
                status: newStatus,
                current_period_start: currentPeriodStart,
                current_period_end: currentPeriodEnd,
                trial_ends_at: trialEndsAt,
                cancels_at: null,
                paused_at: null,
              })
              .eq('id', subscriptionId);

            result = { 
              success: true, 
              switched: true, 
              newProvider: 'stripe',
              stripeSubscriptionId: pendingStripeSubId,
              status: newStatus,
            };
            logStep("Switch confirmed", { stripeSubId: pendingStripeSubId, finalStatus: stripeSub.status });
            break;
          }
          
          // Phase 1: Create the Stripe subscription for 3DS confirmation
          if (!paymentMethodId) {
            throw new Error('Payment method ID is required for switching to Stripe');
          }

          // Get the product info to create new Stripe subscription
          const { data: product } = await supabaseClient
            .from('products')
            .select('name, billing_interval')
            .eq('id', subscription.product_id)
            .single();

          if (!product) {
            throw new Error('Product not found');
          }

          // Get user info
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('email, full_name')
            .eq('id', subscription.user_id)
            .single();

          if (!profile?.email) {
            throw new Error('User email not found');
          }

          const stripe = new Stripe(getStripeSecretKey(), {
            apiVersion: "2025-08-27.basil",
          });

          // Find or create Stripe customer
          const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
          let customerId: string;
          
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
          } else {
            const customer = await stripe.customers.create({
              email: profile.email,
              name: profile.full_name || undefined,
            });
            customerId = customer.id;
          }

          // Attach payment method to customer
          await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
          });

          // Set as default payment method
          await stripe.customers.update(customerId, {
            invoice_settings: {
              default_payment_method: paymentMethodId,
            },
          });

          // Create or find Stripe price dynamically
          const subCurrency = (subscription.currency || 'USD').toLowerCase();
          const subAmount = subscription.amount || 0;
          const priceAmount = Math.round(subAmount * 100);
          
          // Map interval
          const intervalMap: Record<string, 'day' | 'week' | 'month' | 'year'> = {
            'daily': 'day',
            'weekly': 'week',
            'monthly': 'month',
            'annual': 'year',
            'yearly': 'year',
          };
          const stripeInterval = intervalMap[subscription.interval || product.billing_interval || 'monthly'] || 'month';
          
          // Build lookup key
          const lookupKey = `sub_${subscription.product_id}_${stripeInterval}_${subCurrency}_${priceAmount}`;
          
          // Try to find existing price
          let priceId: string | null = null;
          const existingPrices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
          
          if (existingPrices.data.length > 0) {
            priceId = existingPrices.data[0].id;
            logStep("Found existing Stripe price", { priceId });
          } else {
            // Find or create Stripe product
            const stripeProducts = await stripe.products.list({ limit: 100 });
            const existingStripeProduct = stripeProducts.data.find((p: any) =>
              p.metadata?.supabase_product_id === subscription.product_id
            );

            let stripeProductId: string;
            if (existingStripeProduct) {
              stripeProductId = existingStripeProduct.id;
            } else {
              const newProduct = await stripe.products.create({
                name: product.name,
                metadata: { supabase_product_id: subscription.product_id },
              });
              stripeProductId = newProduct.id;
              logStep("Created Stripe product", { stripeProductId });
            }

            // Create price
            const newPrice = await stripe.prices.create({
              product: stripeProductId,
              unit_amount: priceAmount,
              currency: subCurrency,
              recurring: { interval: stripeInterval },
              lookup_key: lookupKey,
            });
            priceId = newPrice.id;
            logStep("Created Stripe price", { priceId, amount: priceAmount, currency: subCurrency });
          }

          // Check if the original subscription has remaining trial days
          const originalTrialEnd = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
          const now = new Date();
          const hasActiveTrial = originalTrialEnd && originalTrialEnd > now;
          const remainingTrialDays = hasActiveTrial ? Math.ceil((originalTrialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          
          logStep("Trial check", { hasActiveTrial, remainingTrialDays, originalTrialEnd: subscription.trial_ends_at });

          // Create Stripe subscription 
          // If there's an active trial, add trial_end to avoid immediate charge
          const subCreateParams: any = {
            customer: customerId,
            items: [{ price: priceId }],
            default_payment_method: paymentMethodId,
            payment_settings: {
              save_default_payment_method: 'on_subscription',
            },
            expand: ['latest_invoice.payment_intent'],
          };

          // If there's remaining trial time, preserve it
          if (hasActiveTrial && remainingTrialDays > 0) {
            subCreateParams.trial_end = Math.floor(originalTrialEnd.getTime() / 1000);
            logStep("Preserving trial period", { trial_end: originalTrialEnd.toISOString() });
          } else {
            // No trial - use default_incomplete for 3DS
            subCreateParams.payment_behavior = 'default_incomplete';
          }

          const newStripeSub = await stripe.subscriptions.create(subCreateParams);

          logStep("Created Stripe subscription", { 
            subId: newStripeSub.id, 
            status: newStripeSub.status,
            trialEnd: newStripeSub.trial_end 
          });

          // Extract client_secret for 3DS confirmation (may be null during trial)
          const latestInvoice = newStripeSub.latest_invoice as any;
          const paymentIntent = latestInvoice?.payment_intent as any;
          const clientSecret = paymentIntent?.client_secret;
          
          // If subscription is already active or trialing, complete the switch immediately
          if (newStripeSub.status === 'active' || newStripeSub.status === 'trialing') {
            logStep("Subscription active/trialing immediately, completing switch", { status: newStripeSub.status });
            
            // Cancel PayPal subscription
            const cancelResponse = await fetch(
              `${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscription.provider_subscription_id}/cancel`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${access_token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ reason: "Switched to card payment" }),
              }
            );

            if (!cancelResponse.ok) {
              logStep("Failed to cancel PayPal (non-blocking)", { error: await cancelResponse.text() });
            } else {
              logStep("PayPal subscription cancelled successfully");
            }

            // Update subscription record
            const currentPeriodEnd = unixSecondsToIso(newStripeSub.current_period_end);
            const currentPeriodStart = unixSecondsToIso(newStripeSub.current_period_start);
            const trialEndsAt = newStripeSub.trial_end ? unixSecondsToIso(newStripeSub.trial_end) : null;

            await supabaseClient
              .from('subscriptions')
              .update({
                payment_provider: 'stripe',
                provider_subscription_id: newStripeSub.id,
                status: newStripeSub.status === 'trialing' ? 'trialing' : 'active',
                current_period_start: currentPeriodStart,
                current_period_end: currentPeriodEnd,
                trial_ends_at: trialEndsAt,
                cancels_at: null,
                paused_at: null,
              })
              .eq('id', subscriptionId);

            result = { 
              success: true, 
              switched: true, 
              newProvider: 'stripe',
              stripeSubscriptionId: newStripeSub.id,
              status: newStripeSub.status,
            };
          } else if (clientSecret) {
            // Subscription requires 3DS confirmation
            result = { 
              success: true,
              requiresConfirmation: true,
              clientSecret: clientSecret,
              stripeSubscriptionId: newStripeSub.id,
              paymentIntentStatus: paymentIntent?.status,
            };
            logStep("3DS confirmation required", { 
              stripeSubId: newStripeSub.id,
              paymentIntentStatus: paymentIntent?.status 
            });
          } else {
            // No client secret and not active/trialing - unusual case
            logStep("Unusual state: no client secret and subscription not active", { status: newStripeSub.status });
            throw new Error(`Subscription creation failed with status: ${newStripeSub.status}`);
          }
          break;
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Unknown payment provider");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
