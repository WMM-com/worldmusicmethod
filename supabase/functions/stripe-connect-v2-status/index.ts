/**
 * stripe-connect-v2-status
 * 
 * Retrieves the current status of a V2 connected account directly from the
 * Stripe API. This includes:
 * - Whether card_payments capability is active (ready to process payments)
 * - Whether onboarding requirements are complete
 * - What requirements are still outstanding
 *
 * IMPORTANT: Per the demo requirements, we always fetch status from the API
 * directly rather than caching in the database. This ensures real-time accuracy.
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

    // Look up the connected account ID from the database
    const { data: paymentAccount } = await supabase
      .from('payment_accounts')
      .select('account_id')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .single();

    if (!paymentAccount?.account_id) {
      return new Response(JSON.stringify({ 
        hasAccount: false,
        error: 'No connected account found' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeAccountId = paymentAccount.account_id;

    // Retrieve the V2 account with expanded configuration and requirements
    // The 'include' parameter fetches additional nested objects
    const account = await stripeClient.v2.core.accounts.retrieve(stripeAccountId, {
      include: ['configuration.merchant', 'requirements'],
    });

    // Check if card_payments capability is active — means the account can process payments
    const readyToProcessPayments = account?.configuration
      ?.merchant?.capabilities?.card_payments?.status === 'active';

    // Check onboarding requirements status
    // 'currently_due' = user needs to provide info now
    // 'past_due' = user missed the deadline to provide info
    // Neither = onboarding is complete
    const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status;
    const onboardingComplete = requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';

    // Update the database with the latest status
    if (onboardingComplete && readyToProcessPayments) {
      await supabase
        .from('payment_accounts')
        .update({
          onboarding_complete: true,
          account_status: 'active',
        })
        .eq('user_id', user.id)
        .eq('provider', 'stripe');
    }

    console.log('[stripe-connect-v2-status] Account status:', {
      accountId: stripeAccountId,
      readyToProcessPayments,
      onboardingComplete,
      requirementsStatus,
    });

    return new Response(JSON.stringify({
      hasAccount: true,
      accountId: stripeAccountId,
      readyToProcessPayments,
      onboardingComplete,
      requirementsStatus: requirementsStatus || 'none',
      displayName: account.display_name,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[stripe-connect-v2-status] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
