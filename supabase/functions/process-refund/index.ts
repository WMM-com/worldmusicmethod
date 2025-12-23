import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
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

      // Get access token
      const tokenResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      const { access_token } = await tokenResponse.json();

      // Get capture ID from order details
      const captureId = order.provider_payment_id;

      // Process refund
      const refundResponse = await fetch(
        `https://api-m.paypal.com/v2/payments/captures/${captureId}/refund`,
        {
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
        }
      );

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
