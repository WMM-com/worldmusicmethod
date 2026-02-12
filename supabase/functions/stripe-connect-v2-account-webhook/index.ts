/**
 * stripe-connect-v2-account-webhook
 * 
 * Handles THIN EVENTS from Stripe V2 for connected account changes.
 * Thin events are lightweight payloads that contain only the event ID and type.
 * You must fetch the full event data using the events API.
 *
 * This webhook listens for:
 * - v2.core.account[requirements].updated — Requirements changed (e.g., regulatory changes)
 * - v2.core.account[configuration.merchant].capability_status_updated — Merchant capability changed
 * - v2.core.account[configuration.customer].capability_status_updated — Customer capability changed
 *
 * Setup Instructions:
 * 1. Go to https://dashboard.stripe.com → Developers → Webhooks
 * 2. Click "+ Add destination"
 * 3. In "Events from" section, select "Connected accounts"
 * 4. Click "Show advanced options" → Payload style: select "Thin"
 * 5. Search for "v2" events and select:
 *    - v2.account[requirements].updated
 *    - v2.account[configuration.merchant].capability_status_updated
 *    - v2.account[configuration.customer].capability_status_updated
 * 6. Set the endpoint URL to: <YOUR_SUPABASE_URL>/functions/v1/stripe-connect-v2-account-webhook
 * 7. Copy the webhook signing secret and add it as STRIPE_CONNECT_WEBHOOK_SECRET
 *
 * Local testing with Stripe CLI:
 * stripe listen --thin-events \
 *   'v2.core.account[requirements].updated,v2.core.account[configuration.merchant].capability_status_updated,v2.core.account[configuration.customer].capability_status_updated' \
 *   --forward-thin-to http://localhost:54321/functions/v1/stripe-connect-v2-account-webhook
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
      console.error('[v2-account-webhook] STRIPE_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PLACEHOLDER: Set STRIPE_CONNECT_WEBHOOK_SECRET in your project secrets.
    // Get it from the Stripe Dashboard when creating the webhook endpoint.
    const webhookSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[v2-account-webhook] STRIPE_CONNECT_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({ 
        error: 'Webhook secret not configured. Please add STRIPE_CONNECT_WEBHOOK_SECRET to your project secrets.' 
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

    // Get the raw request body and Stripe signature header
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the thin event — this verifies the webhook signature
    // Thin events only contain the event ID and type, not the full data
    const thinEvent = stripeClient.parseThinEvent(body, sig, webhookSecret);

    console.log('[v2-account-webhook] Received thin event:', thinEvent.type, 'id:', thinEvent.id);

    // Fetch the full event data from the Stripe API
    const event = await stripeClient.v2.core.events.retrieve(thinEvent.id);

    // Handle different event types
    switch (event.type) {
      case 'v2.core.account.requirements.updated': {
        // Requirements changed — could be due to regulatory changes
        // Fetch the latest account status and update the database
        console.log('[v2-account-webhook] Requirements updated for account');
        
        // TODO: Extract the account ID from the event and update requirements status
        // The event.data will contain the account object with updated requirements
        const accountData = event.data;
        if (accountData?.id) {
          const account = await stripeClient.v2.core.accounts.retrieve(accountData.id, {
            include: ['requirements'],
          });
          
          const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status;
          const needsAction = requirementsStatus === 'currently_due' || requirementsStatus === 'past_due';
          
          // Update the payment_accounts table with the new status
          await supabase
            .from('payment_accounts')
            .update({
              account_status: needsAction ? 'action_required' : 'active',
              metadata: {
                requirements_status: requirementsStatus,
                last_webhook_at: new Date().toISOString(),
              },
            })
            .eq('account_id', accountData.id)
            .eq('provider', 'stripe');
            
          console.log('[v2-account-webhook] Updated requirements status:', requirementsStatus);
        }
        break;
      }

      case 'v2.core.account.configuration.merchant.capability_status_updated': {
        // Merchant capability status changed (e.g., card_payments activated/deactivated)
        console.log('[v2-account-webhook] Merchant capability status updated');
        
        const accountData = event.data;
        if (accountData?.id) {
          const account = await stripeClient.v2.core.accounts.retrieve(accountData.id, {
            include: ['configuration.merchant'],
          });
          
          const cardPaymentsActive = account.configuration
            ?.merchant?.capabilities?.card_payments?.status === 'active';
          
          await supabase
            .from('payment_accounts')
            .update({
              onboarding_complete: cardPaymentsActive,
              account_status: cardPaymentsActive ? 'active' : 'pending',
            })
            .eq('account_id', accountData.id)
            .eq('provider', 'stripe');
            
          console.log('[v2-account-webhook] Card payments active:', cardPaymentsActive);
        }
        break;
      }

      case 'v2.core.account.configuration.customer.capability_status_updated': {
        // Customer capability status changed
        console.log('[v2-account-webhook] Customer capability status updated');
        // TODO: Handle customer capability changes if needed
        break;
      }

      default:
        console.log('[v2-account-webhook] Unhandled event type:', event.type);
    }

    // Always return 200 to acknowledge receipt
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[v2-account-webhook] Error:', error);
    // Return 400 for signature verification failures, 500 for other errors
    const status = error.message?.includes('signature') ? 400 : 500;
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
