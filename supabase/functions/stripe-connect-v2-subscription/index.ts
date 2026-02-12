/**
 * stripe-connect-v2-subscription
 * 
 * Creates a Stripe Checkout session for SUBSCRIPTION charges to a connected account.
 * With V2 accounts, we use customer_account instead of customer to charge the
 * connected account directly (they are both account and customer in V2).
 *
 * This is used for platform-level subscriptions where the connected account
 * pays the platform a recurring fee (e.g., SaaS fees, premium features).
 *
 * Flow:
 * 1. Authenticate the user
 * 2. Get their connected account ID
 * 3. Create a subscription checkout session using customer_account
 * 4. Return the URL for redirect
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

    // Get the user's connected account
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
    const { priceId } = await req.json();

    // PLACEHOLDER: Set up a subscription price in your Stripe Dashboard.
    // The priceId should be a recurring price (e.g., price_abc123).
    // You can create one at https://dashboard.stripe.com/prices/create
    const subscriptionPriceId = priceId || Deno.env.get('PLATFORM_SUBSCRIPTION_PRICE_ID');
    if (!subscriptionPriceId) {
      return new Response(JSON.stringify({ 
        error: 'No subscription price configured. Set PLATFORM_SUBSCRIPTION_PRICE_ID or pass priceId.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const origin = req.headers.get('origin') || 'http://localhost:5173';

    // Create a subscription checkout session
    // IMPORTANT: For V2 accounts, use customer_account (not customer)
    // The connected account ID (acct_...) serves as both the account AND customer
    const session = await stripeClient.checkout.sessions.create({
      // V2: Use customer_account instead of customer for connected accounts
      customer_account: accountId,
      mode: 'subscription',
      line_items: [
        { price: subscriptionPriceId, quantity: 1 },
      ],
      success_url: `${origin}/account?subscription_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/account?subscription_cancelled=true`,
    });

    console.log('[stripe-connect-v2-subscription] Created subscription session:', session.id, 'for account:', accountId);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[stripe-connect-v2-subscription] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
