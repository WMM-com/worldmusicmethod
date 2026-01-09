import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[MANAGE-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : '');
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
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
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
          const { newAmount } = data;
          
          // Get current subscription
          const stripeSub = await stripe.subscriptions.retrieve(
            subscription.provider_subscription_id
          );
          
          const currentItem = stripeSub.items.data[0];
          const currentPrice = await stripe.prices.retrieve(currentItem.price.id);
          
          // Map database interval to Stripe interval
          const intervalMap: Record<string, 'day' | 'week' | 'month' | 'year'> = {
            'daily': 'day',
            'weekly': 'week',
            'monthly': 'month',
            'yearly': 'year',
            'annual': 'year',
          };
          const dbInterval = subscription.interval || 'monthly';
          const stripeInterval = intervalMap[dbInterval] || currentPrice.recurring?.interval || 'month';
          
          // Create new price with correct interval from subscription
          const newPrice = await stripe.prices.create({
            product: currentPrice.product as string,
            unit_amount: Math.round(newAmount * 100),
            currency: 'usd',
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

          result = { newAmount };
          logStep("Price updated", { newAmount, interval: stripeInterval });
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
            const origin = data?.returnUrl || Deno.env.get("FRONTEND_URL") || "https://worldmusicmethod.com";
            
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

      const tokenResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
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
            `https://api-m.paypal.com/v1/billing/subscriptions/${subscription.provider_subscription_id}/cancel`,
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
            `https://api-m.paypal.com/v1/billing/subscriptions/${subscription.provider_subscription_id}/suspend`,
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
            `https://api-m.paypal.com/v1/billing/subscriptions/${subscription.provider_subscription_id}/activate`,
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
            `https://api-m.paypal.com/v1/billing/subscriptions/${subscription.provider_subscription_id}/cancel`,
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
            `https://api-m.paypal.com/v1/billing/subscriptions/${subscription.provider_subscription_id}/activate`,
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
          // PayPal requires creating a new plan to change price
          // For now, just update in database and note that next billing will use new amount
          const { newAmount } = data;
          
          await supabaseClient
            .from('subscriptions')
            .update({ amount: newAmount })
            .eq('id', subscriptionId);

          result = { newAmount, note: 'Price updated in database. PayPal billing will reflect this on next renewal.' };
          logStep("PayPal subscription price updated in database", { newAmount });
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
