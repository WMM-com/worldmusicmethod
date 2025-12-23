import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      // Build query
      let query = supabaseClient
        .from('orders')
        .select(`
          *,
          products:product_id (name, product_type)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`email.ilike.%${search}%,customer_name.ilike.%${search}%`);
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

      // Enrich with Stripe fee data for completed Stripe orders
      const enrichedOrders = await Promise.all(
        (orders || []).map(async (order) => {
          if (order.payment_provider === 'stripe' && order.provider_payment_id && order.status === 'completed') {
            try {
              // Get payment intent to get the charge
              const paymentIntent = await stripe.paymentIntents.retrieve(order.provider_payment_id);
              
              if (paymentIntent.latest_charge) {
                const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
                const balanceTransaction = charge.balance_transaction;
                
                if (balanceTransaction && typeof balanceTransaction !== 'string') {
                  const stripeFee = (balanceTransaction as any).fee / 100;
                  const netAmount = (balanceTransaction as any).net / 100;
                  
                  // Update in database for caching
                  await supabaseClient
                    .from('orders')
                    .update({ stripe_fee: stripeFee, net_amount: netAmount })
                    .eq('id', order.id);
                  
                  return { ...order, stripe_fee: stripeFee, net_amount: netAmount };
                } else if (typeof balanceTransaction === 'string') {
                  // Fetch the balance transaction
                  const bt = await stripe.balanceTransactions.retrieve(balanceTransaction);
                  const stripeFee = bt.fee / 100;
                  const netAmount = bt.net / 100;
                  
                  await supabaseClient
                    .from('orders')
                    .update({ stripe_fee: stripeFee, net_amount: netAmount })
                    .eq('id', order.id);
                  
                  return { ...order, stripe_fee: stripeFee, net_amount: netAmount };
                }
              }
            } catch (e) {
              logStep("Error fetching Stripe fee", { orderId: order.id, error: e });
            }
          }
          
          // Estimate PayPal fee (2.9% + $0.30)
          if (order.payment_provider === 'paypal' && order.status === 'completed' && !order.paypal_fee) {
            const paypalFee = (order.amount * 0.029) + 0.30;
            const netAmount = order.amount - paypalFee;
            
            await supabaseClient
              .from('orders')
              .update({ paypal_fee: paypalFee, net_amount: netAmount })
              .eq('id', order.id);
            
            return { ...order, paypal_fee: paypalFee, net_amount: netAmount };
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
        query = query.or(`customer_email.ilike.%${search}%,customer_name.ilike.%${search}%`);
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
      // Get aggregated stats
      let ordersQuery = supabaseClient
        .from('orders')
        .select('amount, status, stripe_fee, paypal_fee, net_amount');

      let subscriptionsQuery = supabaseClient
        .from('subscriptions')
        .select('status, amount');

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

      const completedOrders = orders.filter(o => o.status === 'completed');
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
      const totalStripeFees = completedOrders.reduce((sum, o) => sum + (o.stripe_fee || 0), 0);
      const totalPaypalFees = completedOrders.reduce((sum, o) => sum + (o.paypal_fee || 0), 0);
      const totalNetRevenue = completedOrders.reduce((sum, o) => sum + (o.net_amount || o.amount || 0), 0);
      
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
      const monthlyRecurring = activeSubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);

      const stats = {
        totalRevenue,
        totalNetRevenue,
        totalFees: totalStripeFees + totalPaypalFees,
        totalStripeFees,
        totalPaypalFees,
        completedOrdersCount: completedOrders.length,
        refundedOrdersCount: orders.filter(o => o.status === 'refunded').length,
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
