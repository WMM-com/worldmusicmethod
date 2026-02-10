/**
 * stripe-connect-v2-portal
 * 
 * Creates a Stripe Billing Portal session for a connected account.
 * The portal allows users to manage their platform subscription:
 * - View invoices
 * - Update payment method
 * - Cancel or change subscription
 *
 * For V2 accounts, use customer_account instead of customer.
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

    const origin = req.headers.get('origin') || 'http://localhost:5173';

    // Create a billing portal session
    // For V2 accounts, use customer_account instead of customer
    const session = await stripeClient.billingPortal.sessions.create({
      customer_account: paymentAccount.account_id,
      return_url: `${origin}/account`,
    });

    console.log('[stripe-connect-v2-portal] Created portal session for account:', paymentAccount.account_id);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[stripe-connect-v2-portal] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
