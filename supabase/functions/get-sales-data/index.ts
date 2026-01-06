import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize search queries to prevent filter injection
function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  return query
    .replace(/[%_,()]/g, '\\$&')
    .replace(/^[\s]+|[\s]+$/g, '')
    .slice(0, 100);
}

const logStep = (step: string, details?: any) => {
  console.log(`[GET-SALES-DATA] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, page = 1, limit = 30, search, dateFrom, dateTo } = await req.json();

    logStep("Request received", { type, page, limit, search });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    if (type === 'orders') {
      // Build query - fetch orders first, then get profile data separately
      // This avoids inner join issues when profiles don't exist
      let query = supabaseClient
        .from('orders')
        .select(`
          *,
          products:product_id (name, product_type)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (search) {
        const safeSearch = sanitizeSearchQuery(search);
        query = query.or(`email.ilike.%${safeSearch}%,customer_name.ilike.%${safeSearch}%`);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: orders, count, error } = await query;

      if (error) throw error;

      // Fetch profiles separately for user_ids that exist
      const userIds = [...new Set((orders || []).map(o => o.user_id).filter(Boolean))];
      let profilesMap: Record<string, { full_name: string | null; first_name: string | null; last_name: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabaseClient
          .from('profiles')
          .select('id, full_name, first_name, last_name')
          .in('id', userIds);
        
        (profiles || []).forEach(p => {
          profilesMap[p.id] = { full_name: p.full_name, first_name: p.first_name, last_name: p.last_name };
        });
      }

      // Group orders by payment intent to calculate proportional fees
      const ordersByPaymentId: Record<string, typeof orders> = {};
      (orders || []).forEach(order => {
        if (order.provider_payment_id) {
          if (!ordersByPaymentId[order.provider_payment_id]) {
            ordersByPaymentId[order.provider_payment_id] = [];
          }
          ordersByPaymentId[order.provider_payment_id].push(order);
        }
      });

      // Fetch Stripe fees once per payment intent and cache the result
      const feeCache: Record<string, { totalFee: number; totalAmount: number }> = {};
      
      for (const paymentId of Object.keys(ordersByPaymentId)) {
        const ordersForPayment = ordersByPaymentId[paymentId];
        const firstOrder = ordersForPayment[0];
        
        if (firstOrder.payment_provider === 'stripe' && firstOrder.status === 'completed') {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
            if (paymentIntent.latest_charge) {
              const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
              let totalFee = 0;
              
              if (charge.balance_transaction) {
                const bt = typeof charge.balance_transaction === 'string' 
                  ? await stripe.balanceTransactions.retrieve(charge.balance_transaction)
                  : charge.balance_transaction;
                totalFee = bt.fee / 100;
              }
              
              // Total amount for this payment (sum of all order amounts with same payment id)
              const totalAmount = ordersForPayment.reduce((sum, o) => sum + (o.amount || 0), 0);
              feeCache[paymentId] = { totalFee, totalAmount };
            }
          } catch (e) {
            logStep("Error fetching Stripe fee", { paymentId, error: e });
          }
        }
      }

      // Enrich with proportional fee data and customer names from profile
      const enrichedOrders = await Promise.all(
        (orders || []).map(async (order) => {
          // Build customer name from profile if available
          let customerName = order.customer_name;
          const profile = order.user_id ? profilesMap[order.user_id] : null;
          if (profile) {
            const fromFullName = (profile.full_name || '').trim();
            const fromParts = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            const bestName = fromFullName || fromParts;
            if (bestName) {
              customerName = bestName;
            }
          }
          order.customer_name = customerName;
          
          // Calculate proportional Stripe fee
          if (order.payment_provider === 'stripe' && order.provider_payment_id && order.status === 'completed') {
            const cached = feeCache[order.provider_payment_id];
            if (cached && cached.totalAmount > 0) {
              // Proportional fee based on this order's share of the total payment
              const proportion = (order.amount || 0) / cached.totalAmount;
              const stripeFee = cached.totalFee * proportion;
              const netAmount = (order.amount || 0) - stripeFee;
              
              // Update in database for caching
              await supabaseClient
                .from('orders')
                .update({ stripe_fee: stripeFee, net_amount: netAmount })
                .eq('id', order.id);
              
              return { ...order, stripe_fee: stripeFee, net_amount: netAmount };
            }
          }
          
          // PayPal fee backfill (subscriptions used to store subscriptionId instead of capture/transaction id)
          if (order.payment_provider === 'paypal' && order.status === 'completed' && !order.paypal_fee) {
            try {
              const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
              const clientSecret = Deno.env.get('PAYPAL_SECRET');

              if (clientId && clientSecret) {
                const auth = btoa(`${clientId}:${clientSecret}`);
                const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
                  method: 'POST',
                  headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: 'grant_type=client_credentials',
                });

                const tokenJson = await tokenRes.json();
                const accessToken = tokenJson?.access_token;

                if (tokenRes.ok && accessToken) {
                  let captureOrTxId = String(order.provider_payment_id || '');

                  // If this is actually a subscription id (I-...), resolve the latest transaction id
                  if (captureOrTxId.startsWith('I-') && order.subscription_id) {
                    const { data: sub } = await supabaseClient
                      .from('subscriptions')
                      .select('provider_subscription_id, current_period_start')
                      .eq('id', order.subscription_id)
                      .maybeSingle();

                    const subId = sub?.provider_subscription_id;
                    if (subId) {
                      const start = sub.current_period_start
                        ? new Date(sub.current_period_start)
                        : new Date(Date.now() - 14 * 86400000);
                      const end = new Date();

                      const txRes = await fetch(
                        `https://api-m.paypal.com/v1/billing/subscriptions/${subId}/transactions?start_time=${encodeURIComponent(
                          start.toISOString()
                        )}&end_time=${encodeURIComponent(end.toISOString())}`,
                        {
                          headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                          },
                        }
                      );

                      const txJson = await txRes.json();
                      const txList = (txJson?.transactions || txJson?.agreement_transaction_list || []) as any[];
                      const lastTx = txList.length ? txList[txList.length - 1] : null;
                      const txId = lastTx?.id || lastTx?.transaction_id || lastTx?.transaction_info?.transaction_id;
                      const feeVal = lastTx?.fee_amount?.value || lastTx?.transaction_info?.fee_amount?.value;
                      const netVal = lastTx?.net_amount?.value || lastTx?.transaction_info?.net_amount?.value;

                      if (txId) captureOrTxId = String(txId);
                      const paypalFee = feeVal != null && feeVal !== '' ? Number(feeVal) : null;
                      const netAmount = netVal != null && netVal !== '' ? Number(netVal) : null;

                      await supabaseClient
                        .from('orders')
                        .update({
                          provider_payment_id: captureOrTxId,
                          paypal_fee: paypalFee,
                          net_amount: netAmount,
                        })
                        .eq('id', order.id);

                      return { ...order, provider_payment_id: captureOrTxId, paypal_fee: paypalFee, net_amount: netAmount };
                    }
                  }
                }
              }
            } catch (e) {
              logStep('PayPal fee backfill error (non-fatal)', { orderId: order.id, message: String(e) });
            }

            return order;
          }

          return order;
        })
      );

      logStep("Orders fetched", { count, returned: enrichedOrders.length });

      return new Response(
        JSON.stringify({ 
          data: enrichedOrders, 
          total: count,
          page,
          totalPages: Math.ceil((count || 0) / limit)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (type === 'subscriptions') {
      let query = supabaseClient
        .from('subscriptions')
        .select(`
          *,
          products:product_id (name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (search) {
        const safeSearch = sanitizeSearchQuery(search);
        query = query.or(`customer_email.ilike.%${safeSearch}%,customer_name.ilike.%${safeSearch}%`);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: subscriptions, count, error } = await query;

      if (error) throw error;

      logStep("Subscriptions fetched", { count, returned: subscriptions?.length });

      return new Response(
        JSON.stringify({ 
          data: subscriptions, 
          total: count,
          page,
          totalPages: Math.ceil((count || 0) / limit)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (type === 'stats') {
      // Get aggregated stats with currency breakdown - include refund_amount for partial refunds
      let ordersQuery = supabaseClient
        .from('orders')
        .select('amount, status, stripe_fee, paypal_fee, net_amount, currency, refund_amount');

      let subscriptionsQuery = supabaseClient
        .from('subscriptions')
        .select('status, amount, currency');

      if (dateFrom) {
        ordersQuery = ordersQuery.gte('created_at', dateFrom);
        subscriptionsQuery = subscriptionsQuery.gte('created_at', dateFrom);
      }

      if (dateTo) {
        ordersQuery = ordersQuery.lte('created_at', dateTo);
        subscriptionsQuery = subscriptionsQuery.lte('created_at', dateTo);
      }

      const [ordersResult, subscriptionsResult] = await Promise.all([
        ordersQuery,
        subscriptionsQuery,
      ]);

      const orders = ordersResult.data || [];
      const subscriptions = subscriptionsResult.data || [];

      // Include both completed and partial_refund orders in revenue calculations
      const revenueOrders = orders.filter(o => o.status === 'completed' || o.status === 'partial_refund');
      
      // Currency-specific revenue breakdown
      const revenueByCurrency: Record<string, number> = {};
      const feesByCurrency: Record<string, number> = {};
      const netByCurrency: Record<string, number> = {};
      const refundsByCurrency: Record<string, number> = {};
      
      revenueOrders.forEach(o => {
        const curr = (o.currency || 'USD').toUpperCase();
        // For partial refunds, calculate the actual revenue (amount minus refund)
        const refundAmount = o.refund_amount || 0;
        const effectiveRevenue = (o.amount || 0) - refundAmount;
        
        revenueByCurrency[curr] = (revenueByCurrency[curr] || 0) + effectiveRevenue;
        const fee = (o.stripe_fee || 0) + (o.paypal_fee || 0);
        feesByCurrency[curr] = (feesByCurrency[curr] || 0) + fee;
        // Net amount should also account for refunds
        const effectiveNet = (o.net_amount || o.amount || 0) - refundAmount;
        netByCurrency[curr] = (netByCurrency[curr] || 0) + effectiveNet;
        
        // Track refunds separately
        if (refundAmount > 0) {
          refundsByCurrency[curr] = (refundsByCurrency[curr] || 0) + refundAmount;
        }
      });
      
      // Exchange rates to USD (approximate)
      const exchangeRates: Record<string, number> = {
        USD: 1,
        GBP: 1.27,
        EUR: 1.08,
      };
      
      // Calculate combined USD total
      let combinedRevenueUSD = 0;
      let combinedNetUSD = 0;
      let combinedFeesUSD = 0;
      
      Object.entries(revenueByCurrency).forEach(([curr, amount]) => {
        const rate = exchangeRates[curr] || 1;
        combinedRevenueUSD += amount * rate;
      });
      
      Object.entries(netByCurrency).forEach(([curr, amount]) => {
        const rate = exchangeRates[curr] || 1;
        combinedNetUSD += amount * rate;
      });
      
      Object.entries(feesByCurrency).forEach(([curr, amount]) => {
        const rate = exchangeRates[curr] || 1;
        combinedFeesUSD += amount * rate;
      });

      const totalStripeFees = revenueOrders.reduce((sum, o) => sum + (o.stripe_fee || 0), 0);
      const totalPaypalFees = revenueOrders.reduce((sum, o) => sum + (o.paypal_fee || 0), 0);
      const totalRefunds = revenueOrders.reduce((sum, o) => sum + (o.refund_amount || 0), 0);
      
      // Calculate refunds in USD
      let combinedRefundsUSD = 0;
      Object.entries(refundsByCurrency).forEach(([curr, amount]) => {
        const rate = exchangeRates[curr] || 1;
        combinedRefundsUSD += amount * rate;
      });
      
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
      const monthlyRecurring = activeSubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);

      const stats = {
        // Legacy totals (sum of all currencies without conversion - for backward compat)
        totalRevenue: combinedRevenueUSD,
        totalNetRevenue: combinedNetUSD,
        totalFees: combinedFeesUSD,
        totalStripeFees,
        totalPaypalFees,
        totalRefunds: combinedRefundsUSD,
        // Currency breakdowns
        revenueByCurrency,
        netByCurrency,
        feesByCurrency,
        refundsByCurrency,
        combinedRevenueUSD,
        combinedNetUSD,
        combinedFeesUSD,
        combinedRefundsUSD,
        // Counts - include partial_refund in completed count since they still represent revenue
        completedOrdersCount: revenueOrders.length,
        refundedOrdersCount: orders.filter(o => o.status === 'refunded').length,
        partialRefundCount: orders.filter(o => o.status === 'partial_refund').length,
        activeSubscriptionsCount: activeSubscriptions.length,
        cancelledSubscriptionsCount: subscriptions.filter(s => s.status === 'cancelled').length,
        pausedSubscriptionsCount: subscriptions.filter(s => s.status === 'paused').length,
        monthlyRecurringRevenue: monthlyRecurring,
      };

      logStep("Stats calculated", stats);

      return new Response(
        JSON.stringify(stats),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid type parameter");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
