import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get request body
    const { returnUrl, refreshUrl } = await req.json();

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    // Check for existing payment account
    const { data: existingAccount } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .single();

    let stripeAccountId: string;

    if (existingAccount?.account_id) {
      // Use existing Stripe account
      stripeAccountId = existingAccount.account_id;
      console.log('[stripe-connect-onboard] Using existing account:', stripeAccountId);
    } else {
      // Create new Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      stripeAccountId = account.id;
      console.log('[stripe-connect-onboard] Created new account:', stripeAccountId);

      // Upsert payment account record
      const { error: upsertError } = await supabase
        .from('payment_accounts')
        .upsert({
          user_id: user.id,
          provider: 'stripe',
          account_id: stripeAccountId,
          account_status: 'pending',
          onboarding_complete: false,
          account_email: user.email,
          metadata: { stripe_account_type: 'express' },
        }, { onConflict: 'user_id,provider' });

      if (upsertError) {
        console.error('[stripe-connect-onboard] Error saving account:', upsertError);
      }
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/profile?stripe_refresh=true`,
      return_url: returnUrl || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/profile?stripe_success=true`,
      type: 'account_onboarding',
    });

    console.log('[stripe-connect-onboard] Created onboarding link for user:', user.id);

    return new Response(JSON.stringify({ 
      url: accountLink.url,
      accountId: stripeAccountId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[stripe-connect-onboard] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
