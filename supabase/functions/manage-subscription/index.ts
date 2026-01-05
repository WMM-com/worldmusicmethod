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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, subscriptionId, data } = await req.json();

    logStep("Action requested", { action, subscriptionId });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get subscription from database
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      throw new Error("Subscription not found");
    }

    logStep("Subscription found", { 
      provider: subscription.payment_provider, 
      providerId: subscription.provider_subscription_id 
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
          
          await supabaseClient
            .from('subscriptions')
            .update({ 
              status: 'pending_cancellation', 
              cancels_at: new Date(canceledSub.current_period_end * 1000).toISOString(),
              current_period_end: new Date(canceledSub.current_period_end * 1000).toISOString()
            })
            .eq('id', subscriptionId);

          result = { 
            status: 'pending_cancellation',
            cancels_at: new Date(canceledSub.current_period_end * 1000).toISOString()
          };
          logStep("Subscription set to cancel at period end");
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
          const { couponCode, discountPercent } = data;
          
          // Create coupon in Stripe
          const coupon = await stripe.coupons.create({
            percent_off: discountPercent,
            duration: 'forever',
            name: couponCode,
          });

          await stripe.subscriptions.update(
            subscription.provider_subscription_id,
            { coupon: coupon.id }
          );

          await supabaseClient
            .from('subscriptions')
            .update({ 
              coupon_code: couponCode, 
              coupon_discount: discountPercent 
            })
            .eq('id', subscriptionId);

          result = { couponApplied: couponCode };
          logStep("Coupon applied", { couponCode, discountPercent });
          break;
        }

        case 'remove_coupon': {
          await stripe.subscriptions.update(
            subscription.provider_subscription_id,
            { coupon: '' }
          );

          await supabaseClient
            .from('subscriptions')
            .update({ 
              coupon_code: null, 
              coupon_discount: null 
            })
            .eq('id', subscriptionId);

          result = { couponRemoved: true };
          logStep("Coupon removed");
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
          const periodEnd = subscription.current_period_end 
            ? new Date(subscription.current_period_end) 
            : now;

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

        default:
          throw new Error(`Action not supported for PayPal: ${action}`);
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
