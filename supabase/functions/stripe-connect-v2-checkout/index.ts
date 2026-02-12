/**
 * stripe-connect-v2-checkout
 * 
 * Creates a Stripe Checkout session for a DIRECT CHARGE on a connected account.
 * Direct charges mean the payment is processed directly on the connected account
 * (not the platform), so the connected account is the merchant of record.
 *
 * This is used by the public storefront — customers buy products from a
 * specific connected account (seller).
 *
 * Flow:
 * 1. Receive the connected account ID and product details
 * 2. Create a Checkout session on the connected account
 * 3. Return the Checkout URL for redirect
 */
import Stripe from 'https://esm.sh/stripe@20.2.0';
import { getStripeSecretKey } from "../_shared/stripe-key.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = getStripeSecretKey();
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ 
        error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your project secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeClient = new Stripe(stripeSecretKey);

    // Parse the checkout request
    // accountId: The connected account processing the payment
    // priceId: The Stripe Price ID for the product
    // productName, unitAmount, currency: Used if no priceId (creates price_data inline)
    // quantity: How many units to purchase
    const { accountId, priceId, productName, unitAmount, currency, quantity } = await req.json();

    if (!accountId) {
      return new Response(JSON.stringify({ error: 'accountId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const origin = req.headers.get('origin') || 'http://localhost:5173';

    // Build the line_items array
    // If a priceId is provided, use it directly
    // Otherwise, create inline price_data (useful for one-off products)
    const lineItems = priceId
      ? [{ price: priceId, quantity: quantity || 1 }]
      : [{
          price_data: {
            currency: currency || 'usd',
            product_data: { name: productName || 'Product' },
            unit_amount: unitAmount || 0,
          },
          quantity: quantity || 1,
        }];

    // Create a Checkout session as a DIRECT CHARGE
    // The stripeAccount option routes the entire payment through the connected account
    const session = await stripeClient.checkout.sessions.create(
      {
        line_items: lineItems,
        mode: 'payment',
        // Redirect URLs after payment completion
        success_url: `${origin}/store/${accountId}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/store/${accountId}`,
      },
      {
        // CRITICAL: This header makes it a direct charge on the connected account
        stripeAccount: accountId,
      }
    );

    console.log('[stripe-connect-v2-checkout] Created session:', session.id, 'for account:', accountId);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[stripe-connect-v2-checkout] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
