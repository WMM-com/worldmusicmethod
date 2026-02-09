import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const now = new Date();
    let expiredPending = 0;
    let expiredPayment = 0;
    let completedPast = 0;

    // === 1. Expire stale "pending" bookings (no tutor response after 72 hours) ===
    const pendingCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
    const { data: stalePending } = await supabase
      .from('booking_requests')
      .select('id')
      .eq('status', 'pending')
      .lt('created_at', pendingCutoff);

    for (const booking of stalePending || []) {
      await supabase
        .from('booking_requests')
        .update({ status: 'expired' })
        .eq('id', booking.id);
      expiredPending++;
    }

    // === 2. Expire stale "payment_pending" bookings (no payment after 48 hours) ===
    const paymentCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const { data: stalePayment } = await supabase
      .from('booking_requests')
      .select('id')
      .eq('status', 'payment_pending')
      .lt('created_at', paymentCutoff);

    for (const booking of stalePayment || []) {
      await supabase
        .from('booking_requests')
        .update({ status: 'expired' })
        .eq('id', booking.id);
      expiredPayment++;
    }

    // === 3. Auto-complete confirmed bookings where lesson time has passed ===
    const { data: pastLessons } = await supabase
      .from('booking_requests')
      .select('id')
      .eq('status', 'confirmed')
      .not('confirmed_slot_end', 'is', null)
      .lt('confirmed_slot_end', now.toISOString());

    for (const booking of pastLessons || []) {
      await supabase
        .from('booking_requests')
        .update({ status: 'completed' })
        .eq('id', booking.id);
      completedPast++;
    }

    console.log(`[process-booking-expiry] Done: expired_pending=${expiredPending}, expired_payment=${expiredPayment}, completed_past=${completedPast}`);

    return new Response(JSON.stringify({
      success: true,
      expired_pending: expiredPending,
      expired_payment: expiredPayment,
      completed_past: completedPast,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[process-booking-expiry] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
