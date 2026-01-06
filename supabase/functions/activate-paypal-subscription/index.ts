import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[ACTIVATE-PAYPAL-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscriptionId, dbSubscriptionId, password } = await req.json();

    if (!subscriptionId) {
      throw new Error("Subscription ID is required");
    }

    logStep("Starting", { subscriptionId, dbSubscriptionId });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get PayPal access token
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_SECRET");
    const auth = btoa(`${clientId}:${clientSecret}`);

    const tokenResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error("Failed to get PayPal access token");
    }

    const accessToken = tokenData.access_token;

    // Get subscription details from PayPal
    const subscriptionResponse = await fetch(`https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const subscriptionData = await subscriptionResponse.json();
    logStep("PayPal subscription data", { 
      status: subscriptionData.status, 
      subscriber: subscriptionData.subscriber?.email_address 
    });

    if (subscriptionData.status !== 'ACTIVE' && subscriptionData.status !== 'APPROVED') {
      throw new Error(`Subscription is not active: ${subscriptionData.status}`);
    }

    // Find the subscription in our database
    let subscription;
    if (dbSubscriptionId) {
      const { data, error } = await supabaseClient
        .from('subscriptions')
        .select('*, products:product_id (*)')
        .eq('id', dbSubscriptionId)
        .single();
      
      if (error) {
        logStep("Error finding subscription by dbId", error);
      } else {
        subscription = data;
      }
    }

    // If not found by dbId, try by provider_subscription_id
    if (!subscription) {
      const { data, error } = await supabaseClient
        .from('subscriptions')
        .select('*, products:product_id (*)')
        .eq('provider_subscription_id', subscriptionId)
        .single();
      
      if (error) {
        throw new Error(`Subscription not found: ${error.message}`);
      }
      subscription = data;
    }

    logStep("Found subscription", { id: subscription.id, status: subscription.status });

    // Calculate period dates from PayPal data
    const startTime = subscriptionData.start_time 
      ? new Date(subscriptionData.start_time).toISOString() 
      : new Date().toISOString();
    
    // Parse billing interval to calculate end date
    const intervalMap: Record<string, number> = {
      'daily': 1,
      'weekly': 7,
      'monthly': 30,
      'annual': 365,
    };
    const daysToAdd = intervalMap[subscription.interval || 'monthly'] || 30;
    const periodEnd = new Date(startTime);
    periodEnd.setDate(periodEnd.getDate() + daysToAdd);

    // Update subscription status
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: startTime,
        current_period_end: periodEnd.toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    logStep("Subscription activated");

    // Find or create user
    const email = subscription.customer_email || subscriptionData.subscriber?.email_address;
    
    let userId: string | null = null;
    
    // Check for existing user
    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email?.toLowerCase());

    if (existingUser) {
      userId = existingUser.id;
      logStep("Existing user found", { userId });
    } else if (password && email) {
      // Create new user
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        logStep("Failed to create user", createError);
      } else if (newUser?.user) {
        userId = newUser.user.id;
        logStep("New user created", { userId });

        // Create profile
        await supabaseClient.from('profiles').upsert({
          id: userId,
          email,
          display_name: subscription.customer_name || email.split('@')[0],
        });
      }
    }

    // Update subscription with user_id if we have one
    if (userId) {
      await supabaseClient
        .from('subscriptions')
        .update({ user_id: userId })
        .eq('id', subscription.id);

      // Grant access to products associated with this subscription (e.g., course groups)
      const product = subscription.products;
      if (product) {
        // Check if this is a membership that grants access to courses
        if (product.grants_course_group_id) {
          // Get all courses in this group
          const { data: groupCourses } = await supabaseClient
            .from('course_group_courses')
            .select('course_id')
            .eq('group_id', product.grants_course_group_id);

          if (groupCourses) {
            for (const gc of groupCourses) {
              // Check if enrollment already exists
              const { data: existingEnrollment } = await supabaseClient
                .from('course_enrollments')
                .select('id')
                .eq('user_id', userId)
                .eq('course_id', gc.course_id)
                .maybeSingle();

              if (!existingEnrollment) {
                await supabaseClient.from('course_enrollments').insert({
                  user_id: userId,
                  course_id: gc.course_id,
                  enrollment_type: 'subscription',
                  is_active: true,
                });
                logStep("Course enrollment created", { courseId: gc.course_id });
              }
            }
          }
        }

        // Also enroll in directly linked course if any
        if (product.course_id) {
          const { data: existingEnrollment } = await supabaseClient
            .from('course_enrollments')
            .select('id')
            .eq('user_id', userId)
            .eq('course_id', product.course_id)
            .maybeSingle();

          if (!existingEnrollment) {
            await supabaseClient.from('course_enrollments').insert({
              user_id: userId,
              course_id: product.course_id,
              enrollment_type: 'subscription',
              is_active: true,
            });
            logStep("Direct course enrollment created", { courseId: product.course_id });
          }
        }
      }
    }

    // Create an order record for the subscription
    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: userId,
        product_id: subscription.product_id,
        payment_provider: 'paypal',
        payment_provider_order_id: subscriptionId,
        status: 'completed',
        amount: subscription.amount,
        currency: subscription.currency || 'USD',
        customer_email: email,
        customer_name: subscription.customer_name,
        coupon_code: subscription.coupon_code,
      })
      .select()
      .single();

    if (orderError) {
      logStep("Order creation error", orderError);
    } else {
      logStep("Order created", { orderId: orderData.id });
    }

    // Send confirmation email
    try {
      await supabaseClient.functions.invoke('send-order-confirmation', {
        body: {
          email,
          customerName: subscription.customer_name || email,
          orderId: orderData?.id || subscription.id,
          products: [{ name: subscription.products?.name || 'Subscription', price: subscription.amount }],
          total: subscription.amount,
          currency: subscription.currency || 'USD',
          isSubscription: true,
        },
      });
      logStep("Confirmation email sent");
    } catch (emailError) {
      logStep("Email error", emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscriptionId: subscription.id,
        userId,
      }),
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
