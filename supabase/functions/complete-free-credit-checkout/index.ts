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

    const { productIds, productDetails, email, fullName, password, creditAmountUsed } = await req.json();
    
    logStep("Request parsed", { productIds, email, creditAmountUsed });

    if (!productIds || !email || !creditAmountUsed) {
      throw new Error("Missing required fields: productIds, email, creditAmountUsed");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find or create user
    let userId: string;
    let isNewUser = false;

    // Check if user exists
    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      logStep("Existing user found", { userId });
    } else if (password) {
      // Create new user
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

    // Verify user has sufficient credits
    const { data: userCredits, error: creditsError } = await supabaseClient
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (creditsError) {
      logStep("Error fetching user credits", { error: creditsError.message });
      throw new Error("Failed to verify credit balance");
    }

    const currentBalance = userCredits?.balance || 0;
    if (currentBalance < creditAmountUsed) {
      throw new Error(`Insufficient credits. Available: ${currentBalance}, Required: ${creditAmountUsed}`);
    }

    logStep("Credit balance verified", { currentBalance, creditAmountUsed });

    // Deduct credits and record transaction
    const newBalance = currentBalance - creditAmountUsed;
    
    // Update user_credits balance
    const { error: updateError } = await supabaseClient
      .from('user_credits')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Failed to deduct credits: ${updateError.message}`);
    }

    logStep("Credits deducted", { newBalance });

    // Record the credit transaction
    const { error: txError } = await supabaseClient
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: -creditAmountUsed, // Negative for spending
        type: 'spent_checkout',
        description: `Checkout for products: ${productIds.join(', ')}`,
        reference_id: `credit_checkout_${Date.now()}`,
      });

    if (txError) {
      logStep("Warning: Failed to record credit transaction", { error: txError.message });
    }

    // Create order record
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: userId,
        email,
        amount: 0,
        currency: 'USD',
        status: 'completed',
        payment_method: 'credit',
        credit_amount_used: creditAmountUsed,
        product_details: productDetails || productIds.map((id: string) => ({ id })),
      })
      .select()
      .single();

    if (orderError) {
      logStep("Warning: Failed to create order record", { error: orderError.message });
    } else {
      logStep("Order created", { orderId: order?.id });
    }

    // Handle course enrollments if any products are courses
    const parsedDetails = typeof productDetails === 'string' 
      ? JSON.parse(productDetails) 
      : productDetails || [];

    for (const product of parsedDetails) {
      if (product.course_id) {
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
            error: enrollError.message 
          });
        } else {
          logStep("Course enrollment created", { courseId: product.course_id });
        }
      }
    }

    logStep("Free credit checkout completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        isNewUser,
        email,
        creditDeducted: creditAmountUsed,
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
