import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[SYNC-SUBSCRIPTION-PAYMENTS] ${step}`, details ? JSON.stringify(details) : "");
};

// Send recurring payment email
async function sendRenewalEmail(
  supabaseClient: any,
  email: string,
  firstName: string,
  productName: string,
  amount: number,
  currency: string,
  nextBillingDate: string | null
) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-renewal-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        email,
        firstName,
        productName,
        amount,
        currency,
        nextBillingDate,
      }),
    });
    
    if (response.ok) {
      logStep("Sent renewal email", { email });
    } else {
      logStep("Failed to send renewal email", { email, status: response.status });
    }
  } catch (e: any) {
    logStep("Error sending renewal email", { email, error: e.message });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const results: Record<string, any> = {
      stripeUpdated: 0,
      stripeOrdersCreated: 0,
      paypalUpdated: 0,
      paypalOrdersCreated: 0,
      emailsSent: 0,
      errors: [] as string[],
    };

    // Get all active subscriptions from our database
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .in("status", ["active", "trialing", "pending", "past_due"]);

    if (subError) throw subError;
    logStep("Fetched subscriptions", { count: subscriptions?.length || 0 });

    // Process Stripe subscriptions
    const stripeSubscriptions = subscriptions?.filter(s => s.payment_provider === "stripe") || [];
    
    for (const dbSub of stripeSubscriptions) {
      if (!dbSub.provider_subscription_id) continue;
      
      try {
        const stripeSub = await stripe.subscriptions.retrieve(dbSub.provider_subscription_id);
        logStep("Stripe subscription fetched", { 
          id: stripeSub.id, 
          status: stripeSub.status,
          dbStatus: dbSub.status,
          periodStart: stripeSub.current_period_start,
          periodEnd: stripeSub.current_period_end,
        });

        // Update status if different
        const statusMap: Record<string, string> = {
          'active': 'active',
          'trialing': 'active',
          'past_due': 'past_due',
          'canceled': 'cancelled',
          'unpaid': 'past_due',
          'incomplete': 'pending',
          'incomplete_expired': 'cancelled',
          'paused': 'paused',
        };
        
        const newStatus = statusMap[stripeSub.status] || dbSub.status;
        
        const updateData: Record<string, any> = {
          status: newStatus,
        };

        // Safely convert Unix timestamps to ISO strings
        if (stripeSub.current_period_start && typeof stripeSub.current_period_start === 'number') {
          updateData.current_period_start = new Date(stripeSub.current_period_start * 1000).toISOString();
        }
        if (stripeSub.current_period_end && typeof stripeSub.current_period_end === 'number') {
          updateData.current_period_end = new Date(stripeSub.current_period_end * 1000).toISOString();
        }
        if (stripeSub.canceled_at && typeof stripeSub.canceled_at === 'number') {
          updateData.cancelled_at = new Date(stripeSub.canceled_at * 1000).toISOString();
        }
        if (stripeSub.cancel_at && typeof stripeSub.cancel_at === 'number') {
          updateData.cancels_at = new Date(stripeSub.cancel_at * 1000).toISOString();
        }

        await supabaseClient
          .from("subscriptions")
          .update(updateData)
          .eq("id", dbSub.id);

        results.stripeUpdated++;

        // Fetch recent invoices for this subscription and create order records
        const invoices = await stripe.invoices.list({
          subscription: stripeSub.id,
          limit: 10,
        });

        for (const invoice of invoices.data) {
          // Skip unpaid invoices and $0 trial invoices
          if (invoice.status !== 'paid') continue;
          if (!invoice.amount_paid || invoice.amount_paid === 0) continue;
          
          // Check if order already exists - use .limit(1) to avoid errors with duplicates
          const { data: existingOrders } = await supabaseClient
            .from("orders")
            .select("id")
            .eq("provider_payment_id", invoice.payment_intent || invoice.id)
            .limit(1);

          if (existingOrders && existingOrders.length > 0) continue;

          // Get charge details for fee
          let stripeFee = 0;
          if (invoice.charge) {
            try {
              const chargeId = typeof invoice.charge === 'string' ? invoice.charge : invoice.charge.id;
              const charge = await stripe.charges.retrieve(chargeId);
              if (charge.balance_transaction) {
                const btId = typeof charge.balance_transaction === 'string' 
                  ? charge.balance_transaction 
                  : charge.balance_transaction.id;
                const bt = await stripe.balanceTransactions.retrieve(btId);
                stripeFee = bt.fee / 100;
              }
            } catch (e) {
              logStep("Could not get fee for invoice", { invoiceId: invoice.id });
            }
          }

          const amount = (invoice.amount_paid || 0) / 100;
          const netAmount = amount - stripeFee;

          const { error: orderError } = await supabaseClient
            .from("orders")
            .insert({
              user_id: dbSub.user_id,
              email: dbSub.customer_email,
              product_id: dbSub.product_id,
              amount: amount,
              currency: (invoice.currency || 'usd').toUpperCase(),
              payment_provider: "stripe",
              provider_payment_id: invoice.payment_intent || invoice.id,
              status: "completed",
              customer_name: dbSub.customer_name,
              subscription_id: dbSub.id,
              stripe_fee: stripeFee,
              net_amount: netAmount,
              coupon_code: dbSub.coupon_code,
              coupon_discount: dbSub.coupon_discount,
            });

          if (!orderError) {
            results.stripeOrdersCreated++;
            logStep("Created order for Stripe invoice", { invoiceId: invoice.id });
            
            // Send renewal email for new orders (skip initial purchase which is handled by complete-stripe-payment)
            // Check if this is not the first invoice by comparing dates
            const invoiceDate = invoice.created ? new Date(invoice.created * 1000) : new Date();
            const subCreated = stripeSub.created ? new Date(stripeSub.created * 1000) : new Date();
            const daysDiff = (invoiceDate.getTime() - subCreated.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysDiff > 1) { // More than 1 day after subscription created = renewal
              // Get product name
              let productName = 'Subscription';
              if (dbSub.product_id) {
                const { data: product } = await supabaseClient
                  .from("products")
                  .select("name")
                  .eq("id", dbSub.product_id)
                  .maybeSingle();
                if (product?.name) productName = product.name;
              }
              
              await sendRenewalEmail(
                supabaseClient,
                dbSub.customer_email,
                dbSub.customer_name?.split(' ')[0] || '',
                productName,
                amount,
                (invoice.currency || 'usd').toUpperCase(),
                dbSub.current_period_end
              );
              results.emailsSent = (results.emailsSent || 0) + 1;
            }
          }
        }
      } catch (e: any) {
        results.errors.push(`Stripe ${dbSub.id}: ${e.message}`);
        logStep("Error processing Stripe subscription", { id: dbSub.id, error: e.message });
      }
    }

    // Process PayPal subscriptions
    const paypalSubscriptions = subscriptions?.filter(s => s.payment_provider === "paypal") || [];
    
    if (paypalSubscriptions.length > 0) {
      const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
      const clientSecret = Deno.env.get("PAYPAL_SECRET");
      
      if (clientId && clientSecret) {
        const auth = btoa(`${clientId}:${clientSecret}`);
        const tokenResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        for (const dbSub of paypalSubscriptions) {
          if (!dbSub.provider_subscription_id) continue;

          try {
            // Fetch subscription from PayPal
            const paypalRes = await fetch(
              `https://api-m.paypal.com/v1/billing/subscriptions/${dbSub.provider_subscription_id}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            const paypalSub = await paypalRes.json();
            if (!paypalRes.ok) {
              logStep("PayPal subscription fetch failed", { id: dbSub.provider_subscription_id });
              continue;
            }

            logStep("PayPal subscription fetched", { 
              id: paypalSub.id, 
              status: paypalSub.status,
              dbStatus: dbSub.status 
            });

            // Map PayPal status
            const paypalStatusMap: Record<string, string> = {
              'ACTIVE': 'active',
              'APPROVED': 'pending',
              'SUSPENDED': 'paused',
              'CANCELLED': 'cancelled',
              'EXPIRED': 'cancelled',
            };

            const newStatus = paypalStatusMap[paypalSub.status] || dbSub.status;

            // Calculate period dates
            const billingInfo = paypalSub.billing_info;
            let periodStart = dbSub.current_period_start;
            let periodEnd = dbSub.current_period_end;

            if (billingInfo?.last_payment?.time) {
              periodStart = new Date(billingInfo.last_payment.time).toISOString();
              
              // Calculate next billing based on interval
              const interval = dbSub.interval || 'monthly';
              const daysMap: Record<string, number> = {
                daily: 1,
                weekly: 7,
                monthly: 30,
                annual: 365,
              };
              const days = daysMap[interval] || 30;
              periodEnd = new Date(new Date(periodStart).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
            }

            await supabaseClient
              .from("subscriptions")
              .update({
                status: newStatus,
                current_period_start: periodStart,
                current_period_end: periodEnd,
              })
              .eq("id", dbSub.id);

            results.paypalUpdated++;

            // Fetch transactions for this subscription
            const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Last 90 days
            const endDate = new Date();

            const txRes = await fetch(
              `https://api-m.paypal.com/v1/billing/subscriptions/${dbSub.provider_subscription_id}/transactions?start_time=${startDate.toISOString()}&end_time=${endDate.toISOString()}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (txRes.ok) {
              const txData = await txRes.json();
              const transactions = txData.transactions || [];

              for (const tx of transactions) {
                const txId = tx.id;
                if (!txId) continue;

                // Check if order exists - use .limit(1) to avoid errors with duplicates
                const { data: existingOrders } = await supabaseClient
                  .from("orders")
                  .select("id")
                  .eq("provider_payment_id", txId)
                  .limit(1);
                
                const existingOrder = existingOrders && existingOrders.length > 0 ? existingOrders[0] : null;

                if (existingOrder) continue;

                const amount = parseFloat(tx.amount_with_breakdown?.gross_amount?.value || tx.amount?.value || "0");
                const fee = parseFloat(tx.amount_with_breakdown?.fee_amount?.value || "0");
                const net = parseFloat(tx.amount_with_breakdown?.net_amount?.value || String(amount - fee));
                const currency = tx.amount_with_breakdown?.gross_amount?.currency_code || tx.amount?.currency_code || "USD";

                const { error: orderError } = await supabaseClient
                  .from("orders")
                  .insert({
                    user_id: dbSub.user_id,
                    email: dbSub.customer_email,
                    product_id: dbSub.product_id,
                    amount: amount,
                    currency: currency,
                    payment_provider: "paypal",
                    provider_payment_id: txId,
                    status: "completed",
                    customer_name: dbSub.customer_name,
                    subscription_id: dbSub.id,
                    paypal_fee: fee || null,
                    net_amount: net || null,
                    coupon_code: dbSub.coupon_code,
                    coupon_discount: dbSub.coupon_discount,
                  });

                if (!orderError) {
                  results.paypalOrdersCreated++;
                  logStep("Created order for PayPal transaction", { txId });
                  
                  // Send renewal email for new PayPal orders
                  // Check if this is a renewal (transaction date > subscription created)
                  const txDate = tx.time ? new Date(tx.time) : new Date();
                  const subCreated = dbSub.created_at ? new Date(dbSub.created_at) : new Date();
                  const daysDiff = (txDate.getTime() - subCreated.getTime()) / (1000 * 60 * 60 * 24);
                  
                  if (daysDiff > 1) {
                    let productName = 'Subscription';
                    if (dbSub.product_id) {
                      const { data: product } = await supabaseClient
                        .from("products")
                        .select("name")
                        .eq("id", dbSub.product_id)
                        .maybeSingle();
                      if (product?.name) productName = product.name;
                    }
                    
                    await sendRenewalEmail(
                      supabaseClient,
                      dbSub.customer_email,
                      dbSub.customer_name?.split(' ')[0] || '',
                      productName,
                      amount,
                      currency,
                      dbSub.current_period_end
                    );
                    results.emailsSent = (results.emailsSent || 0) + 1;
                  }
                }
              }
            }
          } catch (e: any) {
            results.errors.push(`PayPal ${dbSub.id}: ${e.message}`);
            logStep("Error processing PayPal subscription", { id: dbSub.id, error: e.message });
          }
        }
      }
    }

    logStep("Sync complete", results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
