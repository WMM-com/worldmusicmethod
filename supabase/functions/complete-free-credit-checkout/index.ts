import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMPLETE-FREE-CREDIT-CHECKOUT] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { productIds, productDetails, email, fullName, password, creditAmountUsed, couponCode } = await req.json();
    
    logStep("Request parsed", { productIds, email, creditAmountUsed, couponCode });

    if (!productIds || !email) {
      throw new Error("Missing required fields: productIds, email");
    }

    const creditToUse = creditAmountUsed || 0;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find or create user
    let userId: string;
    let isNewUser = false;

    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      logStep("Existing user found", { userId });
    } else if (password) {
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (createError) throw new Error(`Failed to create user: ${createError.message}`);
      userId = newUser.user!.id;
      isNewUser = true;
      logStep("New user created", { userId });
    } else {
      throw new Error("User not found and no password provided for account creation");
    }

    // Only verify/deduct credits if credits are being used
    let currentBalance = 0;
    let newBalance = 0;

    if (creditToUse > 0) {
      const { data: userCredits, error: creditsError } = await supabaseClient
        .from('user_credits')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (creditsError) {
        logStep("Error fetching user credits", { error: creditsError.message });
        throw new Error("Failed to verify credit balance");
      }

      currentBalance = userCredits?.balance || 0;
      if (currentBalance < creditToUse) {
        throw new Error(`Insufficient credits. Available: ${currentBalance}, Required: ${creditToUse}`);
      }

      logStep("Credit balance verified", { currentBalance, creditToUse });

      newBalance = currentBalance - creditToUse;

      const { error: updateError } = await supabaseClient
        .from('user_credits')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Failed to deduct credits: ${updateError.message}`);
      }

      logStep("Credits deducted", { newBalance });

      // Record credit transaction
      const { error: txError } = await supabaseClient
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: -creditToUse,
          type: 'spent_checkout',
          description: `Checkout for products: ${productIds.join(', ')}`,
          reference_id: `credit_checkout_${Date.now()}`,
        });

      if (txError) {
        logStep("Warning: Failed to record credit transaction", { error: txError.message });
      }
    } else {
      logStep("No credits to deduct (coupon-only free checkout)");
    }

    // Look up product details from database to get course_id
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, name, course_id')
      .in('id', productIds);

    if (productsError) {
      logStep("Warning: Failed to fetch products", { error: productsError.message });
    }

    logStep("Products fetched", { count: products?.length });

    // Create order records for each product (matching orders table schema)
    for (const pid of productIds) {
      const product = products?.find((p: any) => p.id === pid);
      
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .insert({
          user_id: userId,
          email,
          product_id: pid,
          amount: 0,
          currency: 'USD',
          payment_provider: creditToUse > 0 ? 'credit' : 'coupon',
          provider_payment_id: `free_${Date.now()}_${pid}`,
          status: 'completed',
          customer_name: fullName || email,
          coupon_code: couponCode || null,
          coupon_discount: 0,
          stripe_fee: 0,
          net_amount: 0,
        })
        .select()
        .single();

      if (orderError) {
        logStep("Warning: Failed to create order record", { productId: pid, error: orderError.message });
      } else {
        logStep("Order created", { orderId: order?.id, productId: pid });
      }

      // Create course enrollment if product has a course_id
      if (product?.course_id) {
        const { error: enrollError } = await supabaseClient
          .from('course_enrollments')
          .upsert({
            user_id: userId,
            course_id: product.course_id,
            enrollment_type: 'purchase',
            is_active: true,
          }, { onConflict: 'user_id,course_id' });

        if (enrollError) {
          logStep("Warning: Failed to create course enrollment", {
            courseId: product.course_id,
            error: enrollError.message,
          });
        } else {
          logStep("Course enrollment created", { courseId: product.course_id });
        }
      }
    }

    logStep("Free credit checkout completed successfully");

    // Send order confirmation email
    try {
      const orderItems = (products || [])
        .filter((p: any) => productIds.includes(p.id))
        .map((p: any) => ({ name: p.name || 'Course', amount: 0 }));

      // Fallback if no products found
      if (orderItems.length === 0) {
        orderItems.push({ name: 'Course Purchase', amount: 0 });
      }

      const { data: userProfile } = await supabaseClient
        .from('profiles')
        .select('first_name')
        .eq('id', userId)
        .single();

      const firstName = userProfile?.first_name || fullName?.split(' ')[0] || '';

      const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-order-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          email,
          firstName,
          orderItems,
          totalAmount: 0,
          currency: 'USD',
          isSubscription: false,
        }),
      });

      if (emailResponse.ok) {
        logStep("Order confirmation email sent");
      } else {
        logStep("Order confirmation email failed (non-fatal)", { status: emailResponse.status });
      }
    } catch (emailError) {
      logStep("Order confirmation email error (non-fatal)", { error: String(emailError) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        isNewUser,
        email,
        creditDeducted: creditToUse,
        newBalance,
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
