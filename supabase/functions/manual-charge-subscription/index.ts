import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getStripeSecretKey } from '../_shared/stripe-key.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const logStep = (step: string, details?: any) => {
  console.log(`[MANUAL-CHARGE] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, subscriptionId, action } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action is required' }),
        { status: 200, headers: corsHeaders }
      );
    }

    const stripeKey = getStripeSecretKey();
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Stripe not configured' }),
        { status: 200, headers: corsHeaders }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find subscription either by ID or by email
    let subscription: any = null;

    if (subscriptionId) {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .maybeSingle();
      subscription = data;
    } else if (email) {
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

      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('payment_provider', 'stripe')
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      subscription = data;
    }

    if (!subscription) {
      return new Response(
        JSON.stringify({ success: false, error: 'No active Stripe subscription found' }),
        { status: 200, headers: corsHeaders }
      );
    }

    logStep('Found subscription', { subId: subscription.id, stripeSubId: subscription.provider_subscription_id });

    if (action === 'charge_now') {
      if (!subscription.provider_subscription_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'No Stripe subscription ID linked' }),
          { status: 200, headers: corsHeaders }
        );
      }

      if (subscription.payment_provider !== 'stripe') {
        return new Response(
          JSON.stringify({ success: false, error: 'Only Stripe subscriptions can be manually charged' }),
          { status: 200, headers: corsHeaders }
        );
      }

      const stripeSub = await stripe.subscriptions.retrieve(subscription.provider_subscription_id);
      const customerId = stripeSub.customer as string;

      // Create a one-off invoice for this subscription
      const invoice = await stripe.invoices.create({
        customer: customerId,
        subscription: subscription.provider_subscription_id,
        auto_advance: true,
      });

      logStep('Invoice created', { invoiceId: invoice.id });

      await stripe.invoices.finalizeInvoice(invoice.id);
      const paidInvoice = await stripe.invoices.pay(invoice.id);

      logStep('Invoice paid', { amount: paidInvoice.amount_paid, status: paidInvoice.status });

      // Update subscription billing dates in DB
      const nextBilling = new Date();
      if (subscription.interval === 'yearly' || subscription.interval === 'annual') {
        nextBilling.setFullYear(nextBilling.getFullYear() + 1);
      } else {
        nextBilling.setMonth(nextBilling.getMonth() + 1);
      }

      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: nextBilling.toISOString(),
          trial_end: null,
          trial_ends_at: null,
        })
        .eq('id', subscription.id);

      // Create order record
      const chargedAmount = paidInvoice.amount_paid / 100;
      const { error: orderError } = await supabase.from('orders').insert({
        user_id: subscription.user_id,
        email: subscription.customer_email,
        product_id: subscription.product_id,
        subscription_id: subscription.id,
        amount: chargedAmount,
        currency: (paidInvoice.currency || 'usd').toUpperCase(),
        payment_provider: 'stripe',
        provider_payment_id: paidInvoice.id,
        status: 'completed',
      });

      if (orderError) {
        logStep('Order creation error', { error: orderError.message });
      }

      return new Response(
        JSON.stringify({
          success: true,
          charged: chargedAmount,
          currency: (paidInvoice.currency || 'usd').toUpperCase(),
          nextBilling: nextBilling.toISOString(),
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep('ERROR', { message: msg });
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 200, headers: corsHeaders }
    );
  }
});
