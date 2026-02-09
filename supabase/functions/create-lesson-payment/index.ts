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

    const { bookingRequestId } = await req.json();
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

    // Verify the student is the one paying
    if (booking.student_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Only the student can pay for this booking' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify status is payment_pending
    if (booking.status !== 'payment_pending') {
      return new Response(JSON.stringify({ error: `Booking is not awaiting payment (status: ${booking.status})` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lesson = booking.lesson;
    const amountInCents = Math.round((lesson.price || 0) * 100);

    if (amountInCents <= 0) {
      // Free lesson - skip payment, confirm directly
      await supabase
        .from('booking_requests')
        .update({ status: 'confirmed' })
        .eq('id', bookingRequestId);

      return new Response(JSON.stringify({ 
        success: true, 
        free: true,
        message: 'Free lesson confirmed!' 
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if tutor has a Stripe Connect account
    const { data: tutorPaymentAccount } = await supabase
      .from('payment_accounts')
      .select('account_id, onboarding_complete')
      .eq('user_id', lesson.tutor_id)
      .eq('provider', 'stripe')
      .single();

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const origin = req.headers.get('origin') || 'https://worldmusicmethod.lovable.app';

    // Build checkout session params
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

    // If tutor has Stripe Connect, use destination charge
    if (tutorPaymentAccount?.account_id && tutorPaymentAccount?.onboarding_complete) {
      const platformFeePercent = 0.10; // 10% platform fee
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(amountInCents * platformFeePercent),
        transfer_data: {
          destination: tutorPaymentAccount.account_id,
        },
      };
      console.log('[create-lesson-payment] Using Stripe Connect destination:', tutorPaymentAccount.account_id);
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('[create-lesson-payment] Checkout session created:', session.id);

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[create-lesson-payment] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
