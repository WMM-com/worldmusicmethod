import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getStripeSecretKey } from "../_shared/stripe-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[PROCESS-REFUND] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, amount, reason } = await req.json();

    logStep("Refund requested", { orderId, amount, reason });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get order from database
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*, products(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    if (order.status === 'refunded') {
      throw new Error("Order has already been refunded");
    }

    logStep("Order found", { 
      provider: order.payment_provider, 
      providerId: order.provider_payment_id,
      amount: order.amount
    });

    const refundAmount = amount || order.amount;
    let providerRefundId: string | null = null;

    if (order.payment_provider === 'stripe') {
      const stripe = new Stripe(getStripeSecretKey(), {
        apiVersion: "2025-08-27.basil",
      });

      // Find the payment intent or charge
      const paymentIntentId = order.provider_payment_id;
      
      let refund;
      if (paymentIntentId.startsWith('pi_')) {
        // Refund using payment intent
        refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: Math.round(refundAmount * 100),
          reason: reason === 'duplicate' ? 'duplicate' : 
                  reason === 'fraudulent' ? 'fraudulent' : 
                  'requested_by_customer',
        });
      } else if (paymentIntentId.startsWith('ch_')) {
        // Refund using charge ID
        refund = await stripe.refunds.create({
          charge: paymentIntentId,
          amount: Math.round(refundAmount * 100),
          reason: reason === 'duplicate' ? 'duplicate' : 
                  reason === 'fraudulent' ? 'fraudulent' : 
                  'requested_by_customer',
        });
      } else {
        throw new Error("Invalid Stripe payment ID format");
      }

      providerRefundId = refund.id;
      logStep("Stripe refund processed", { refundId: refund.id, status: refund.status });

    } else if (order.payment_provider === 'paypal') {
      const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
      const clientSecret = Deno.env.get("PAYPAL_SECRET");

      if (!clientId || !clientSecret) {
        throw new Error("PayPal credentials not configured");
      }

      const auth = btoa(`${clientId}:${clientSecret}`);

      // Use sandbox or production based on environment
      const useSandbox = Deno.env.get("PAYPAL_SANDBOX") === "true" || 
        getStripeSecretKey()?.startsWith("sk_test_");
      const paypalBaseUrl = useSandbox 
        ? "https://api-m.sandbox.paypal.com" 
        : "https://api-m.paypal.com";

      // Get access token
      const tokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      const tokenJson = await tokenResponse.json();
      const access_token = tokenJson?.access_token;
      if (!tokenResponse.ok || !access_token) {
        throw new Error(`PayPal auth failed: ${tokenJson?.error_description || tokenJson?.error || 'unknown error'}`);
      }

      // For one-time PayPal orders, provider_payment_id is a capture id.
      // For PayPal subscriptions, we historically stored the subscription id (I-...) here.
      // In that case, look up the latest transaction and refund its capture/transaction id.
      let captureId = String(order.provider_payment_id || '');

      const looksLikeSubscriptionId = captureId.startsWith('I-');
      if (looksLikeSubscriptionId) {
        if (!order.subscription_id) {
          throw new Error('PayPal subscription refund needs subscription_id on the order');
        }

        const { data: sub, error: subErr } = await supabaseClient
          .from('subscriptions')
          .select('provider_subscription_id, current_period_start')
          .eq('id', order.subscription_id)
          .maybeSingle();

        if (subErr || !sub?.provider_subscription_id) {
          throw new Error('PayPal subscription not found for this order');
        }

        const start = sub.current_period_start ? new Date(sub.current_period_start) : new Date(Date.now() - 14 * 86400000);
        const end = new Date();

        const txRes = await fetch(
          `${paypalBaseUrl}/v1/billing/subscriptions/${sub.provider_subscription_id}/transactions?start_time=${encodeURIComponent(
            start.toISOString()
          )}&end_time=${encodeURIComponent(end.toISOString())}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const txJson = await txRes.json();
        if (!txRes.ok) {
          throw new Error(`PayPal subscription transactions fetch failed: ${txJson?.message || JSON.stringify(txJson)}`);
        }

        const txList = (txJson?.transactions || txJson?.agreement_transaction_list || []) as any[];
        const lastTx = txList.length ? txList[txList.length - 1] : null;
        const txId = lastTx?.id || lastTx?.transaction_id || lastTx?.transaction_info?.transaction_id;

        if (!txId) {
          throw new Error('No PayPal subscription transaction id found to refund');
        }

        captureId = String(txId);

        // Update the order so future refunds use the capture/transaction id directly
        await supabaseClient
          .from('orders')
          .update({ provider_payment_id: captureId })
          .eq('id', orderId);
      }

      // Process refund
      const refundResponse = await fetch(`${paypalBaseUrl}/v2/payments/captures/${captureId}/refund`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: {
            value: refundAmount.toFixed(2),
            currency_code: order.currency.toUpperCase(),
          },
          note_to_payer: reason || "Refund processed",
        }),
      });

      if (!refundResponse.ok) {
        const errorData = await refundResponse.json();
        throw new Error(`PayPal refund failed: ${errorData.message || JSON.stringify(errorData)}`);
      }

      const refundData = await refundResponse.json();
      providerRefundId = refundData.id;
      logStep("PayPal refund processed", { refundId: refundData.id, status: refundData.status });
    } else {
      throw new Error("Unknown payment provider");
    }

    // Update order in database
    const isFullRefund = refundAmount >= order.amount;
    
    await supabaseClient
      .from('orders')
      .update({
        status: isFullRefund ? 'refunded' : 'partial_refund',
        refund_amount: refundAmount,
        refunded_at: new Date().toISOString(),
        refund_reason: reason,
        provider_refund_id: providerRefundId,
      })
      .eq('id', orderId);

    // If order is linked to a subscription and it's a full refund, cancel subscription access
    if (order.subscription_id && isFullRefund) {
      await supabaseClient
        .from('subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', order.subscription_id);
    }

    // If product has refund_remove_tag enabled, remove the tag from the user
    if (order.products?.refund_remove_tag && order.products?.purchase_tag_id && order.user_id) {
      await supabaseClient
        .from('contact_tags')
        .delete()
        .match({ 
          contact_id: order.user_id, 
          tag_id: order.products.purchase_tag_id 
        });
      logStep("Removed purchase tag from user");
    }

    // Remove course enrollment if applicable
    if (order.products?.course_id && order.user_id && isFullRefund) {
      await supabaseClient
        .from('course_enrollments')
        .update({ is_active: false })
        .match({ 
          user_id: order.user_id, 
          course_id: order.products.course_id 
        });
      logStep("Deactivated course enrollment");
    }

    logStep("Refund completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        refundId: providerRefundId,
        refundAmount,
        isFullRefund 
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
