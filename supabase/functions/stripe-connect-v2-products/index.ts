/**
 * stripe-connect-v2-products
 * 
 * Manages products on a connected account using the Stripe-Account header.
 * Products are created ON the connected account (not the platform), so they
 * belong to the individual seller.
 *
 * Supports two operations:
 * - POST: Create a new product with a default price
 * - GET: List all active products on the connected account
 *
 * The Stripe-Account header (passed via stripeAccount option) ensures all
 * API calls are scoped to the connected account.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Get the user's connected account ID
    const { data: paymentAccount } = await supabase
      .from('payment_accounts')
      .select('account_id')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .single();

    if (!paymentAccount?.account_id) {
      return new Response(JSON.stringify({ error: 'No connected account found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accountId = paymentAccount.account_id;

    if (req.method === 'POST') {
      // CREATE a new product on the connected account
      const { name, description, priceInCents, currency } = await req.json();

      if (!name || !priceInCents) {
        return new Response(JSON.stringify({ error: 'name and priceInCents are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create product with a default price using the Stripe-Account header
      // The stripeAccount option sends the request as if it's from the connected account
      const product = await stripeClient.products.create({
        name,
        description: description || '',
        // default_price_data creates a Price object automatically
        default_price_data: {
          unit_amount: priceInCents, // Price in smallest currency unit (e.g., cents)
          currency: currency || 'usd',
        },
      }, {
        stripeAccount: accountId, // This sets the Stripe-Account header
      });

      console.log('[stripe-connect-v2-products] Created product:', product.id, 'on account:', accountId);

      return new Response(JSON.stringify({ product }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // LIST active products on the connected account
      // Also expand default_price to include pricing information
      const products = await stripeClient.products.list({
        limit: 20,
        active: true,
        expand: ['data.default_price'],
      }, {
        stripeAccount: accountId, // Scope to connected account
      });

      return new Response(JSON.stringify({ products: products.data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('[stripe-connect-v2-products] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
