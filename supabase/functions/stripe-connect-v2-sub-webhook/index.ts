/**
 * stripe-connect-v2-sub-webhook
 * 
 * Handles standard (non-thin) webhook events for subscription lifecycle changes.
 * These events fire when a connected account's subscription status changes.
 *
 * Monitored events:
 * - customer.subscription.updated — Plan changes, cancellation scheduling, quantity changes
 * - customer.subscription.deleted — Subscription fully cancelled
 * - invoice.paid — Successful payment for a subscription period
 *
 * Setup:
 * 1. Go to Stripe Dashboard → Developers → Webhooks → + Add destination
 * 2. Select events: customer.subscription.updated, customer.subscription.deleted, invoice.paid
 * 3. Endpoint URL: <YOUR_SUPABASE_URL>/functions/v1/stripe-connect-v2-sub-webhook
 * 4. Copy signing secret → add as STRIPE_SUB_WEBHOOK_SECRET in project secrets
 *
 * IMPORTANT: For V2 accounts, the account ID comes from .customer_account (not .customer)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@20.2.0';
import { getStripeSecretKey } from "../_shared/stripe-key.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = getStripeSecretKey();
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PLACEHOLDER: Set STRIPE_SUB_WEBHOOK_SECRET in your project secrets.
    const webhookSecret = Deno.env.get('STRIPE_SUB_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[sub-webhook] STRIPE_SUB_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({ 
        error: 'Webhook secret not configured. Please add STRIPE_SUB_WEBHOOK_SECRET to your project secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeClient = new Stripe(stripeSecretKey);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify webhook signature
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // constructEvent verifies the signature and parses the event
    const event = stripeClient.webhooks.constructEvent(body, sig, webhookSecret);

    console.log('[sub-webhook] Received event:', event.type, 'id:', event.id);

    switch (event.type) {
      // ─── Subscription Updated ───────────────────────────────────────
      // Fires on: plan changes, cancellation scheduling, quantity changes,
      // pausing/resuming collections
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        // For V2 accounts, the account ID is in customer_account (shape: acct_...)
        // NOT in .customer (which would be a cus_ ID for V1)
        const accountId = subscription.customer_account || subscription.customer;
        
        const priceId = subscription.items?.data?.[0]?.price?.id || null;
        const status = subscription.status;
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        console.log('[sub-webhook] Subscription updated:', {
          subscriptionId: subscription.id,
          accountId,
          status,
          cancelAtPeriodEnd,
        });

        // Upsert the subscription record in the database
        // TODO: If you need more granular tracking, add columns for quantity, plan details, etc.
        const { error: upsertError } = await supabase
          .from('connected_account_subscriptions')
          .upsert({
            connected_account_id: accountId,
            subscription_id: subscription.id,
            status,
            price_id: priceId,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: cancelAtPeriodEnd,
          }, { onConflict: 'subscription_id' });

        if (upsertError) {
          console.error('[sub-webhook] Error upserting subscription:', upsertError);
        }
        break;
      }

      // ─── Subscription Deleted ───────────────────────────────────────
      // Fires when a subscription is fully cancelled (not just scheduled)
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const accountId = subscription.customer_account || subscription.customer;

        console.log('[sub-webhook] Subscription deleted:', subscription.id, 'account:', accountId);

        // Update the subscription status to cancelled
        const { error: updateError } = await supabase
          .from('connected_account_subscriptions')
          .upsert({
            connected_account_id: accountId,
            subscription_id: subscription.id,
            status: 'canceled',
            cancel_at_period_end: false,
          }, { onConflict: 'subscription_id' });

        if (updateError) {
          console.error('[sub-webhook] Error updating subscription:', updateError);
        }

        // TODO: Revoke access to premium features for this connected account
        break;
      }

      // ─── Invoice Paid ──────────────────────────────────────────────
      // Fires when a subscription invoice is successfully paid
      case 'invoice.paid': {
        const invoice = event.data.object;
        const accountId = invoice.customer_account || invoice.customer;

        console.log('[sub-webhook] Invoice paid:', invoice.id, 'account:', accountId, 'amount:', invoice.amount_paid);

        // TODO: Record the payment in your financial tracking system
        // TODO: Send a payment receipt notification
        break;
      }

      default:
        console.log('[sub-webhook] Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[sub-webhook] Error:', error);
    const status = error.message?.includes('signature') ? 400 : 500;
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
