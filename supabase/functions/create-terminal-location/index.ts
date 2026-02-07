import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[create-terminal-location] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { gig_id, display_name, city, country, line1 } = body;

    if (!gig_id || !display_name) {
      return new Response(JSON.stringify({ error: 'gig_id and display_name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log('Creating Terminal Location', { gig_id, display_name, city, country });

    // Check artist has a Stripe Connect account
    const { data: paymentAccount } = await supabase
      .from('payment_accounts')
      .select('account_id, onboarding_complete')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .single();

    if (!paymentAccount?.account_id || !paymentAccount.onboarding_complete) {
      return new Response(JSON.stringify({ error: 'Stripe Connect account not set up' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Create Terminal Location on the connected account
    const location = await stripe.terminal.locations.create(
      {
        display_name,
        address: {
          line1: line1 || 'Venue Address',
          city: city || 'City',
          country: country || 'GB',
          postal_code: '',
          state: '',
        },
      },
      {
        stripeAccount: paymentAccount.account_id,
      }
    );

    log('Terminal Location created', { locationId: location.id });

    // Save location_id to the gig
    const { error: updateError } = await supabase
      .from('merch_gigs')
      .update({ stripe_location_id: location.id })
      .eq('id', gig_id)
      .eq('user_id', user.id);

    if (updateError) {
      log('Error saving location to gig', { error: updateError.message });
      // Location was created on Stripe but we failed to save it locally
      return new Response(JSON.stringify({
        error: 'Location created on Stripe but failed to save locally',
        location_id: location.id,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      location_id: location.id,
      display_name: location.display_name,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    log('ERROR', { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
