import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { bookingRequestId, provider } = await req.json();
    if (!bookingRequestId) {
      return new Response(JSON.stringify({ error: 'Missing bookingRequestId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch booking with lesson details
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .select('*, lesson:lessons(id, title, price, currency, duration_minutes, tutor_id)')
      .eq('id', bookingRequestId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (booking.student_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Only the student can pay for this booking' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (booking.status !== 'payment_pending') {
      return new Response(JSON.stringify({ error: `Booking is not awaiting payment (status: ${booking.status})` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lesson = booking.lesson;
    const price = lesson.price || 0;
    const amountInCents = Math.round(price * 100);

    if (amountInCents <= 0) {
      await supabase
        .from('booking_requests')
        .update({ status: 'confirmed' })
        .eq('id', bookingRequestId);

      return new Response(JSON.stringify({ success: true, free: true, message: 'Free lesson confirmed!' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const origin = req.headers.get('origin') || 'https://worldmusicmethod.lovable.app';

    // Get student profile for Flutterwave customer info
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Fetch tutor's payment accounts (both providers)
    const { data: tutorAccounts } = await supabase
      .from('payment_accounts')
      .select('provider, account_id, onboarding_complete')
      .eq('user_id', lesson.tutor_id)
      .eq('onboarding_complete', true);

    const stripeAccount = tutorAccounts?.find(a => a.provider === 'stripe');
    const flutterwaveAccount = tutorAccounts?.find(a => a.provider === 'flutterwave');

    // Determine which provider to use
    const requestedProvider = provider || 'stripe';
    const useFlutterwave = requestedProvider === 'flutterwave' && flutterwaveAccount?.account_id;

    if (useFlutterwave) {
      // ── Flutterwave path ──
      const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
      if (!flutterwaveSecretKey) {
        return new Response(JSON.stringify({ error: 'Flutterwave not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const txRef = `lesson_${bookingRequestId.slice(0, 8)}_${Date.now()}`;

      const paymentPayload = {
        tx_ref: txRef,
        amount: price,
        currency: (lesson.currency || 'USD').toUpperCase(),
        redirect_url: `${origin}/lessons?booking=${bookingRequestId}&payment=success`,
        customer: {
          email: user.email,
          name: studentProfile?.full_name || 'Student',
        },
        customizations: {
          title: `Lesson: ${lesson.title}`,
          description: `${lesson.duration_minutes} minute private lesson`,
        },
        subaccounts: [{ id: flutterwaveAccount.account_id }],
        meta: {
          booking_request_id: bookingRequestId,
          lesson_id: lesson.id,
          student_id: user.id,
          tutor_id: lesson.tutor_id,
        },
      };

      const response = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${flutterwaveSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentPayload),
      });

      const data = await response.json();

      if (data.status !== 'success') {
        console.error('[create-lesson-payment] Flutterwave error:', data);
        throw new Error(data.message || 'Failed to create Flutterwave payment');
      }

      console.log('[create-lesson-payment] Flutterwave payment link created:', data.data.link);

      return new Response(JSON.stringify({ url: data.data.link, txRef, provider: 'flutterwave' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Stripe path (default) ──
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    const sessionParams: any = {
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: (lesson.currency || 'USD').toLowerCase(),
          product_data: {
            name: `Lesson: ${lesson.title}`,
            description: `${lesson.duration_minutes} minute private lesson`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      customer_email: user.email,
      success_url: `${origin}/lessons?booking=${bookingRequestId}&payment=success`,
      cancel_url: `${origin}/lessons?booking=${bookingRequestId}&payment=cancelled`,
      metadata: {
        booking_request_id: bookingRequestId,
        lesson_id: lesson.id,
        student_id: user.id,
        tutor_id: lesson.tutor_id,
      },
    };

    if (stripeAccount?.account_id) {
      const platformFeePercent = 0.10;
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(amountInCents * platformFeePercent),
        transfer_data: {
          destination: stripeAccount.account_id,
        },
      };
      console.log('[create-lesson-payment] Using Stripe Connect destination:', stripeAccount.account_id);
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log('[create-lesson-payment] Checkout session created:', session.id);

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id, provider: 'stripe' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[create-lesson-payment] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
