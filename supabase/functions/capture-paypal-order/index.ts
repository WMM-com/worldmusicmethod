import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_SECRET");
  
  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error("Failed to get PayPal access token");
  }
  
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    
    console.log("[CAPTURE-PAYPAL-ORDER] Starting", { orderId });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const accessToken = await getPayPalAccessToken();

    // Capture the order
    const captureResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await captureResponse.json();

    if (!captureResponse.ok) {
      console.error("[CAPTURE-PAYPAL-ORDER] Capture error:", captureData);
      throw new Error(captureData.message || "Failed to capture PayPal order");
    }

    console.log("[CAPTURE-PAYPAL-ORDER] Order captured", { status: captureData.status });

    // Get the pending order ID from custom_id
    const purchaseUnit = captureData.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const pendingOrderId = capture?.custom_id || purchaseUnit?.custom_id;

    console.log("[CAPTURE-PAYPAL-ORDER] Pending order ID", { pendingOrderId });

    // Fetch the pending order metadata from our table
    const { data: pendingOrder, error: pendingError } = await supabaseClient
      .from("paypal_pending_orders")
      .select("*")
      .eq("id", pendingOrderId)
      .single();

    if (pendingError || !pendingOrder) {
      console.error("[CAPTURE-PAYPAL-ORDER] Pending order not found:", pendingError);
      throw new Error("Order metadata not found");
    }

    // Extract data from pending order
    const productIds = pendingOrder.product_ids || [];
    const productDetails = pendingOrder.product_details || [];
    const email = pendingOrder.email;
    const full_name = pendingOrder.full_name;
    const coupon_code = pendingOrder.coupon_code;
    const coupon_discount = pendingOrder.coupon_discount || 0;

    console.log("[CAPTURE-PAYPAL-ORDER] Order data", { productIds, email, full_name, coupon_code, coupon_discount });

    // Mark pending order as captured
    await supabaseClient
      .from("paypal_pending_orders")
      .update({ captured_at: new Date().toISOString() })
      .eq("id", pendingOrderId);

    // Check if user exists
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
    const user = existingUser?.users?.find(u => u.email === email);

    let userId: string;
    let authToken: string | null = null;

    if (user) {
      userId = user.id;
      console.log("[CAPTURE-PAYPAL-ORDER] Existing user found", { userId });
      
      // Mark email as verified for existing users
      const { error: verifyError } = await supabaseClient
        .from("profiles")
        .update({ email_verified: true, email_verified_at: new Date().toISOString() })
        .eq("id", userId);
      
      if (verifyError) {
        console.log("[CAPTURE-PAYPAL-ORDER] Profile verification update failed", { error: verifyError });
      }
      
      // Generate one-time auth token for existing user
      const { data: tokenResult } = await supabaseClient.rpc('create_payment_auth_token', { p_user_id: userId });
      authToken = tokenResult;
    } else {
      // Create new user with a random secure password (user will reset via email if needed)
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      console.log("[CAPTURE-PAYPAL-ORDER] New user created", { userId });
      
      // Wait for profile trigger to create the profile row
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mark email as verified with retries
      let verifySuccess = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { error: verifyError, data: verifyData } = await supabaseClient
          .from("profiles")
          .update({ email_verified: true, email_verified_at: new Date().toISOString() })
          .eq("id", userId)
          .select('email_verified');
        
        if (!verifyError && verifyData && verifyData.length > 0) {
          verifySuccess = true;
          console.log("[CAPTURE-PAYPAL-ORDER] Profile email_verified set to true", { userId, attempt });
          break;
        }
        
        console.log("[CAPTURE-PAYPAL-ORDER] Profile update retry", { attempt, error: verifyError });
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // If still failed, try upsert as fallback
      if (!verifySuccess) {
        const { error: upsertError } = await supabaseClient
          .from("profiles")
          .upsert({ 
            id: userId,
            email: email.toLowerCase(),
            email_verified: true, 
            email_verified_at: new Date().toISOString() 
          }, { onConflict: 'id' });
        
        if (!upsertError) {
          console.log("[CAPTURE-PAYPAL-ORDER] Profile email_verified set via upsert", { userId });
        } else {
          console.log("[CAPTURE-PAYPAL-ORDER] CRITICAL: Could not set email_verified", { userId, error: upsertError });
        }
      }
      
      // Generate one-time auth token for new user
      const { data: tokenResult } = await supabaseClient.rpc('create_payment_auth_token', { p_user_id: userId });
      authToken = tokenResult;
    }

    // Get all product details
    const { data: products } = await supabaseClient
      .from("products")
      .select("*")
      .in("id", productIds);

    // Get capture details including actual PayPal fee
    const captureAmount = parseFloat(capture?.amount?.value || "0");
    const captureCurrency = capture?.amount?.currency_code || "USD";
    const captureId = capture?.id || captureData.id;
    
    // Get actual PayPal fee from the seller_receivable_breakdown
    const sellerBreakdown = capture?.seller_receivable_breakdown;
    const paypalFeeData = sellerBreakdown?.paypal_fee;
    const actualPaypalFee = paypalFeeData ? parseFloat(paypalFeeData.value) : 0;
    
    console.log("[CAPTURE-PAYPAL-ORDER] Fee data", { 
      actualPaypalFee, 
      feeCurrency: paypalFeeData?.currency_code,
      captureAmount 
    });

    const enrolledCourseIds: string[] = [];
    const orderIds: string[] = [];

    // Calculate each product's share of the final (discounted) amount
    // The captureAmount is the actual amount charged (after coupon discount)
    const totalOriginalAmount = productDetails.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    
    // Create order record for each product
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      const product = products?.find(p => p.id === productId);
      const detail = productDetails.find((d: any) => d.product_id === productId);
      const originalProductAmount = detail?.amount || 0;
      
      // Calculate this product's proportion of the total
      const proportion = totalOriginalAmount > 0 ? originalProductAmount / totalOriginalAmount : 1 / productIds.length;
      
      // Apply the same proportion to the captured (discounted) amount
      const productAmount = captureAmount * proportion;
      const productCouponDiscount = coupon_discount * proportion;
      // Apply proportion to the actual PayPal fee
      const productPaypalFee = actualPaypalFee * proportion;
      const productNetAmount = productAmount - productPaypalFee;

      const { data: orderData, error: orderError } = await supabaseClient
        .from("orders")
        .insert({
          user_id: userId,
          product_id: productId,
          amount: productAmount,
          currency: captureCurrency,
          status: "completed",
          payment_provider: "paypal",
          provider_payment_id: captureId,
          customer_name: full_name,
          email: email,
          coupon_code: coupon_code || null,
          coupon_discount: productCouponDiscount,
          paypal_fee: productPaypalFee,
          net_amount: productNetAmount,
        })
        .select()
        .single();

      if (orderError) {
        console.error("[CAPTURE-PAYPAL-ORDER] Order creation error:", orderError);
      } else {
        console.log("[CAPTURE-PAYPAL-ORDER] Order created", { orderId: orderData.id, productId });
        orderIds.push(orderData.id);
      }

      // Create course enrollment if it's a course product
      if (product?.course_id) {
        const { error: enrollError } = await supabaseClient
          .from("course_enrollments")
          .upsert({
            user_id: userId,
            course_id: product.course_id,
            enrollment_type: "purchase",
            is_active: true,
          }, {
            onConflict: "user_id,course_id",
          });

        if (enrollError) {
          console.error("[CAPTURE-PAYPAL-ORDER] Enrollment error:", enrollError);
        } else {
          console.log("[CAPTURE-PAYPAL-ORDER] Course enrollment created", { courseId: product.course_id });
          enrolledCourseIds.push(product.course_id);
        }
      }

      // Assign purchase tag if product has one
      if (product?.purchase_tag_id && userId) {
        const { data: emailContact } = await supabaseClient
          .from('email_contacts')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (emailContact) {
          await supabaseClient
            .from('contact_tags')
            .upsert({
              contact_id: emailContact.id,
              tag_id: product.purchase_tag_id,
            }, {
              onConflict: 'contact_id,tag_id',
            });
          console.log("[CAPTURE-PAYPAL-ORDER] Purchase tag assigned", { tagId: product.purchase_tag_id });
        }
      }
    }

    // Send order confirmation email
    const productNames = products?.map(p => p.name).join(', ') || 'Product';
    try {
      await supabaseClient.functions.invoke('send-order-confirmation', {
        body: {
          orderId: orderIds[0],
          email,
          customerName: full_name,
          productName: productNames,
          amount: captureAmount,
          currency: captureCurrency,
        },
      });
      console.log("[CAPTURE-PAYPAL-ORDER] Confirmation email sent");
    } catch (emailError) {
      console.error("[CAPTURE-PAYPAL-ORDER] Failed to send confirmation email:", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        captureId: captureData.id,
        status: captureData.status,
        userId,
        courseIds: enrolledCourseIds,
        orderIds,
        authToken,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CAPTURE-PAYPAL-ORDER] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});