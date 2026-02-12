import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { status: 200, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Find PayPal subscriptions without matching order records
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('id, product_id, product_name, amount, currency, payment_provider, paypal_subscription_id, created_at')
      .eq('user_id', profile.id)
      .eq('payment_provider', 'paypal')
      .in('status', ['active', 'trialing']);

    let recovered = 0;
    const details: string[] = [];

    for (const sub of subscriptions || []) {
      // Check if order already exists for this subscription
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('subscription_id', sub.id)
        .maybeSingle();

      if (!existingOrder) {
        const { error } = await supabase.from('orders').insert({
          user_id: profile.id,
          email: profile.email,
          product_id: sub.product_id,
          subscription_id: sub.id,
          amount: sub.amount,
          currency: sub.currency || 'USD',
          payment_provider: 'paypal',
          provider_payment_id: sub.paypal_subscription_id,
          status: 'completed',
          created_at: sub.created_at,
        });

        if (!error) {
          recovered++;
          details.push(`Recovered order for ${sub.product_name || sub.product_id}`);
        } else {
          details.push(`Failed: ${sub.product_name} - ${error.message}`);
        }
      }
    }

    // Also check for one-time PayPal purchases via digital_product_purchases
    const { data: digitalPurchases } = await supabase
      .from('digital_product_purchases')
      .select('id, product_id, amount, currency, provider_payment_id, created_at')
      .eq('seller_id', profile.id)
      .eq('payment_provider', 'paypal')
      .eq('status', 'completed');

    // Check buyer purchases too
    const { data: buyerPurchases } = await supabase
      .from('digital_product_purchases')
      .select('id, product_id, amount, currency, provider_payment_id, created_at')
      .eq('buyer_id', profile.id)
      .eq('payment_provider', 'paypal')
      .eq('status', 'completed');

    return new Response(
      JSON.stringify({ success: true, recovered, details, userId: profile.id }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 200, headers: corsHeaders }
    );
  }
});
