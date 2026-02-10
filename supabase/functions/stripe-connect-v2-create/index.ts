/**
 * stripe-connect-v2-create
 * 
 * Creates a new Stripe Connected Account using the V2 Accounts API.
 * This allows individual users on the platform to connect their own
 * Stripe account for receiving payments from digital products, merchandise, etc.
 *
 * The V2 API creates a unified Account object that serves as both a
 * connected account AND a customer — no separate Customer ID mapping needed.
 *
 * Flow:
 * 1. Authenticate the user via their JWT
 * 2. Create a V2 connected account with Stripe
 * 3. Store the account mapping in the payment_accounts table
 * 4. Return the new account ID
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@20.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Step 1: Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase clients:
    // - Auth client: uses the user's JWT to verify identity
    // - Service client: uses service role key to bypass RLS for DB writes
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's identity
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Parse request body for display name and contact email
    const { display_name, contact_email } = await req.json();

    // Step 3: Initialize Stripe client
    // PLACEHOLDER: The STRIPE_SECRET_KEY must be set in your project secrets.
    // Get it from https://dashboard.stripe.com/apikeys
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('[stripe-connect-v2-create] STRIPE_SECRET_KEY is not configured');
      return new Response(JSON.stringify({ 
        error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your project secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the Stripe client — API version is set automatically by the SDK
    const stripeClient = new Stripe(stripeSecretKey);

    // Step 4: Check if user already has a connected account
    const { data: existingAccount } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .single();

    if (existingAccount?.account_id) {
      console.log('[stripe-connect-v2-create] User already has account:', existingAccount.account_id);
      return new Response(JSON.stringify({ 
        accountId: existingAccount.account_id,
        message: 'Account already exists' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 5: Create a V2 Connected Account
    // IMPORTANT: Do NOT use top-level type: 'express' / 'standard' / 'custom'.
    // The V2 API uses a different structure with configuration objects.
    const account = await stripeClient.v2.core.accounts.create({
      // Display name shown in the Stripe Dashboard and to customers
      display_name: display_name || user.user_metadata?.display_name || user.email,
      // Contact email for the connected account
      contact_email: contact_email || user.email,
      // Identity defines the account's country
      identity: {
        country: 'us', // TODO: Make this dynamic based on user's country
      },
      // 'full' gives the connected account access to their own Stripe Dashboard
      dashboard: 'full',
      // Platform defaults: Stripe collects fees and handles losses
      defaults: {
        responsibilities: {
          fees_collector: 'stripe',
          losses_collector: 'stripe',
        },
      },
      // Configuration for merchant capabilities (accepting payments)
      // and customer capabilities (being charged for subscriptions)
      configuration: {
        customer: {},
        merchant: {
          capabilities: {
            card_payments: {
              requested: true,
            },
          },
        },
      },
    });

    console.log('[stripe-connect-v2-create] Created V2 account:', account.id);

    // Step 6: Store the account mapping in the database
    // This links the platform user to their Stripe connected account
    const { error: upsertError } = await supabase
      .from('payment_accounts')
      .upsert({
        user_id: user.id,
        provider: 'stripe',
        account_id: account.id,
        account_status: 'pending',
        onboarding_complete: false,
        account_email: contact_email || user.email,
        metadata: { 
          stripe_account_type: 'v2',
          dashboard: 'full',
        },
      }, { onConflict: 'user_id,provider' });

    if (upsertError) {
      console.error('[stripe-connect-v2-create] Error saving account:', upsertError);
    }

    return new Response(JSON.stringify({ 
      accountId: account.id,
      message: 'Connected account created successfully',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[stripe-connect-v2-create] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
