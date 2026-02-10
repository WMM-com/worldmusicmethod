/**
 * stripe-connect-v2-storefront
 * 
 * PUBLIC endpoint (no auth required) that lists products for a specific
 * connected account. Used by the public storefront page.
 *
 * The accountId is passed as a query parameter.
 * 
 * NOTE: In production, you should use a different identifier (e.g., username
 * or slug) instead of exposing the Stripe account ID in the URL. Map the
 * public identifier to the account ID on the server side.
 */
import Stripe from 'https://esm.sh/stripe@20.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ 
        error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your project secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeClient = new Stripe(stripeSecretKey);

    // Get the connected account ID from query params
    const url = new URL(req.url);
    const accountId = url.searchParams.get('accountId');

    if (!accountId) {
      return new Response(JSON.stringify({ error: 'accountId query parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List active products on the connected account
    // The stripeAccount option scopes the request to that account's products
    const products = await stripeClient.products.list({
      limit: 20,
      active: true,
      expand: ['data.default_price'], // Include price info in the response
    }, {
      stripeAccount: accountId,
    });

    // Also get the account display name for the storefront header
    let displayName = 'Store';
    try {
      const account = await stripeClient.v2.core.accounts.retrieve(accountId);
      displayName = account.display_name || 'Store';
    } catch (e) {
      console.warn('[storefront] Could not fetch account name:', e.message);
    }

    return new Response(JSON.stringify({ 
      products: products.data,
      storeName: displayName,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[stripe-connect-v2-storefront] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
