import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { getStripeSecretKey } from "../_shared/stripe-key.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[create-merch-checkout] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = getStripeSecretKey();
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured. Add it in your project secrets.');
    }
    if (stripeKey.startsWith('pk_')) {
      throw new Error('Invalid key: STRIPE_SECRET_KEY contains a publishable key (pk_*). Need a secret key (sk_*).');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { gig_id, items, custom_amount, buyer_email } = body;
    // items: Array<{ product_id: string; variant_id?: string; quantity: number; title: string; unit_price: number }>

    log('Request received', { gig_id, itemCount: items?.length, custom_amount, buyer_email });

    if (!gig_id) throw new Error('gig_id is required');

    // Fetch gig details
    const { data: gig, error: gigErr } = await supabase
      .from('merch_gigs')
      .select('*')
      .eq('id', gig_id)
      .single();

    if (gigErr || !gig) throw new Error('Gig not found');
    log('Gig found', { name: gig.name, user_id: gig.user_id, currency: gig.currency });

    // Fetch artist's Stripe Connect account
    const { data: paymentAccount } = await supabase
      .from('payment_accounts')
      .select('account_id, onboarding_complete')
      .eq('user_id', gig.user_id)
      .eq('provider', 'stripe')
      .single();

    if (!paymentAccount?.account_id || !paymentAccount.onboarding_complete) {
      throw new Error('Artist has not connected their Stripe account');
    }

    const stripeConnectId = paymentAccount.account_id;
    log('Stripe Connect account', { stripeConnectId });

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Build line items
    const lineItems: any[] = [];

    if (items && items.length > 0) {
      for (const item of items) {
        lineItems.push({
          price_data: {
            currency: gig.currency.toLowerCase(),
            product_data: {
              name: item.title,
            },
            unit_amount: Math.round(item.unit_price * 100),
          },
          quantity: item.quantity,
        });
      }
    }

    if (custom_amount && custom_amount > 0) {
      lineItems.push({
        price_data: {
          currency: gig.currency.toLowerCase(),
          product_data: {
            name: 'Custom Payment',
          },
          unit_amount: Math.round(custom_amount * 100),
        },
        quantity: 1,
      });
    }

    if (lineItems.length === 0) {
      throw new Error('No items or custom amount provided');
    }

    // Build metadata
    const metadata: Record<string, string> = {
      gig_id,
      artist_user_id: gig.user_id,
    };
    if (items?.length) {
      metadata.product_ids = items.map((i: any) => i.product_id).join(',');
    }

    const origin = req.headers.get('origin') || supabaseUrl.replace('.supabase.co', '.lovable.app');

    // Create checkout session with transfer to artist
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/pay/${gig_id}?success=true`,
      cancel_url: `${origin}/pay/${gig_id}?cancelled=true`,
      customer_email: buyer_email || undefined,
      payment_intent_data: {
        transfer_data: {
          destination: stripeConnectId,
        },
        metadata,
      },
      metadata,
    });

    log('Checkout session created', { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    log('ERROR', { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
