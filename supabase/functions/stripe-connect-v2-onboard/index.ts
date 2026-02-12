/**
 * stripe-connect-v2-onboard
 * 
 * Creates an Account Link for onboarding a V2 connected account.
 * The user is redirected to Stripe's hosted onboarding flow where they
 * provide business details, identity verification, and bank account info.
 *
 * Uses the V2 Account Links API which supports both merchant and customer
 * configurations in a single onboarding flow.
 *
 * Flow:
 * 1. Authenticate the user
 * 2. Look up their connected account ID
 * 3. Create a V2 account link for onboarding
 * 4. Return the URL to redirect the user to
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

    // Parse the return and refresh URLs from the request body
    const { returnUrl, refreshUrl } = await req.json();

    // PLACEHOLDER: STRIPE_SECRET_KEY must be configured
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

    // Look up the user's connected account from the database
    const { data: paymentAccount } = await supabase
      .from('payment_accounts')
      .select('account_id')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .single();

    if (!paymentAccount?.account_id) {
      return new Response(JSON.stringify({ 
        error: 'No connected account found. Please create one first.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accountId = paymentAccount.account_id;

    // Create a V2 Account Link for onboarding
    // This sends the user to Stripe's hosted onboarding where they provide:
    // - Business details
    // - Identity verification
    // - Bank account for payouts
    // The 'configurations' array specifies which capabilities to onboard for:
    // - 'merchant': Accept payments from customers
    // - 'customer': Be charged for platform subscriptions
    const accountLink = await stripeClient.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          // Onboard for both merchant (accept payments) and customer (pay platform fees)
          configurations: ['merchant', 'customer'],
          // Where to send the user if the link expires or they need to restart
          refresh_url: refreshUrl || `${req.headers.get('origin')}/account?stripe_refresh=true`,
          // Where to send the user after they complete onboarding
          // Include the accountId so we can verify status on return
          return_url: returnUrl || `${req.headers.get('origin')}/account?stripe_success=true&accountId=${accountId}`,
        },
      },
    });

    console.log('[stripe-connect-v2-onboard] Created onboarding link for account:', accountId);

    return new Response(JSON.stringify({ 
      url: accountLink.url,
      accountId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[stripe-connect-v2-onboard] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
