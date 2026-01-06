import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[ACTIVATE-PAYPAL-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : "");
};

type SubscriptionItem = {
  item_id: string;
  item_type: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscriptionId, dbSubscriptionId, password } = await req.json();
    if (!subscriptionId) throw new Error("subscriptionId is required");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    logStep("Starting", { subscriptionId, dbSubscriptionId });

    // Try to identify an authenticated user (if checkout was done while logged in)
    const authHeader = req.headers.get("Authorization");
    let authedUserId: string | null = null;
    let authedEmail: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (!userError && userData?.user) {
        authedUserId = userData.user.id;
        authedEmail = userData.user.email?.toLowerCase() ?? null;
        logStep("Authenticated caller", { userId: authedUserId, email: authedEmail });
      }
    }

    // PayPal access token
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_SECRET");
    if (!clientId || !clientSecret) throw new Error("PayPal credentials not configured");

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
    if (!tokenResponse.ok) {
      logStep("PayPal token error", tokenData);
      throw new Error("Failed to get PayPal access token");
    }

    const accessToken = tokenData.access_token as string;

    // Fetch subscription from PayPal
    const paypalSubRes = await fetch(
      `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paypalSub = await paypalSubRes.json();
    logStep("PayPal subscription fetched", { status: paypalSub?.status });

    if (!paypalSubRes.ok) {
      logStep("PayPal subscription fetch error", paypalSub);
      throw new Error("Failed to fetch PayPal subscription");
    }

    const paypalStatus = String(paypalSub?.status || "").toUpperCase();
    if (paypalStatus !== "ACTIVE" && paypalStatus !== "APPROVED") {
      throw new Error(`PayPal subscription not active: ${paypalStatus}`);
    }

    // Find our DB subscription row
    let subscriptionQuery = supabaseClient.from("subscriptions").select("*");

    if (dbSubscriptionId) {
      subscriptionQuery = subscriptionQuery.eq("id", dbSubscriptionId);
    } else {
      subscriptionQuery = subscriptionQuery.eq("provider_subscription_id", subscriptionId);
    }

    const { data: dbSub, error: dbSubError } = await subscriptionQuery.maybeSingle();
    if (dbSubError) throw new Error(`Failed to load subscription: ${dbSubError.message}`);
    if (!dbSub) throw new Error("Subscription record not found in database");

    logStep("DB subscription found", { id: dbSub.id, status: dbSub.status, productId: dbSub.product_id });

    // Load product (needed for interval + purchase_tag_id)
    const { data: product, error: productError } = await supabaseClient
      .from("products")
      .select("*")
      .eq("id", dbSub.product_id)
      .single();

    if (productError || !product) throw new Error("Product not found for subscription");

    // Determine email + customer name
    const emailFromPaypal = paypalSub?.subscriber?.email_address
      ? String(paypalSub.subscriber.email_address).toLowerCase()
      : null;

    const email = (authedEmail || (dbSub.customer_email ? String(dbSub.customer_email).toLowerCase() : null) || emailFromPaypal);
    if (!email) throw new Error("Could not determine customer email");

    let customerName: string | null = dbSub.customer_name ? String(dbSub.customer_name) : null;

    // Prefer profile full_name if available
    const { data: profileByEmail } = await supabaseClient
      .from("profiles")
      .select("id, full_name")
      .eq("email", email)
      .maybeSingle();

    if (profileByEmail?.full_name) {
      customerName = String(profileByEmail.full_name);
    }

    // Determine / create user
    let userId: string | null = authedUserId || (profileByEmail?.id ?? null);

    if (!userId && password) {
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: customerName || email },
      });
      if (createError) throw new Error(`Failed to create user: ${createError.message}`);
      userId = newUser.user.id;
      logStep("User created", { userId });
    }

    // If we have a userId, mark profile as verified (matches Stripe flow)
    if (userId) {
      await supabaseClient
        .from("profiles")
        .update({ email_verified: true, email_verified_at: new Date().toISOString() })
        .eq("id", userId);
    }

    // Compute period start/end
    const startIso = paypalSub?.start_time
      ? new Date(paypalSub.start_time).toISOString()
      : new Date().toISOString();

    const interval = (dbSub.interval || product.billing_interval || "monthly") as string;
    const daysMap: Record<string, number> = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      annual: 365,
      yearly: 365,
    };

    const daysToAdd = daysMap[String(interval).toLowerCase()] ?? 30;
    const periodEnd = new Date(startIso);
    periodEnd.setDate(periodEnd.getDate() + daysToAdd);

    // Activate subscription in DB
    const { error: activateError } = await supabaseClient
      .from("subscriptions")
      .update({
        status: "active",
        user_id: userId,
        customer_email: email,
        customer_name: customerName,
        current_period_start: startIso,
        current_period_end: periodEnd.toISOString(),
      })
      .eq("id", dbSub.id);

    if (activateError) throw new Error(`Failed to activate subscription: ${activateError.message}`);
    logStep("Subscription activated in DB", { id: dbSub.id, userId });

    // Grant access via subscription_items (course / course_group / product)
    if (userId) {
      const { data: items, error: itemsError } = await supabaseClient
        .from("subscription_items")
        .select("item_id, item_type")
        .eq("subscription_product_id", dbSub.product_id);

      if (itemsError) throw new Error(`Failed to load subscription items: ${itemsError.message}`);

      const subItems = (items || []) as SubscriptionItem[];
      logStep("Subscription items", { count: subItems.length });

      for (const item of subItems) {
        if (item.item_type === "course") {
          await supabaseClient
            .from("course_enrollments")
            .upsert(
              {
                user_id: userId,
                course_id: item.item_id,
                enrollment_type: "subscription",
                is_active: true,
              },
              { onConflict: "user_id,course_id" }
            );
        }

        if (item.item_type === "course_group") {
          const { data: groupCourses } = await supabaseClient
            .from("course_group_courses")
            .select("course_id")
            .eq("group_id", item.item_id);

          for (const gc of groupCourses || []) {
            await supabaseClient
              .from("course_enrollments")
              .upsert(
                {
                  user_id: userId,
                  course_id: gc.course_id,
                  enrollment_type: "subscription",
                  is_active: true,
                },
                { onConflict: "user_id,course_id" }
              );
          }
        }

        if (item.item_type === "product") {
          const { data: linkedProduct } = await supabaseClient
            .from("products")
            .select("course_id")
            .eq("id", item.item_id)
            .maybeSingle();

          if (linkedProduct?.course_id) {
            await supabaseClient
              .from("course_enrollments")
              .upsert(
                {
                  user_id: userId,
                  course_id: linkedProduct.course_id,
                  enrollment_type: "subscription",
                  is_active: true,
                },
                { onConflict: "user_id,course_id" }
              );
          }
        }
      }

      logStep("Access granted", { userId });
    }

    // Assign purchase tag (email CRM) if configured
    if (product?.purchase_tag_id) {
      const firstName = (customerName || "").split(" ")[0] || null;
      const lastName = (customerName || "").split(" ").slice(1).join(" ") || null;

      const { data: contact, error: contactErr } = await supabaseClient
        .from("email_contacts")
        .upsert(
          {
            email,
            first_name: firstName,
            last_name: lastName,
            user_id: userId,
            is_subscribed: true,
          },
          { onConflict: "email" }
        )
        .select("id")
        .single();

      if (!contactErr && contact?.id) {
        await supabaseClient.from("contact_tags").upsert(
          {
            contact_id: contact.id,
            tag_id: product.purchase_tag_id,
          },
          { onConflict: "contact_id,tag_id" }
        );
        logStep("Purchase tag assigned", { tagId: product.purchase_tag_id });
      }
    }

    // Create (or ensure) an order record for reporting
    const { data: existingOrder } = await supabaseClient
      .from("orders")
      .select("id")
      .eq("provider_payment_id", subscriptionId)
      .eq("product_id", dbSub.product_id)
      .eq("payment_provider", "paypal")
      .maybeSingle();

    if (!existingOrder) {
      const { error: orderError } = await supabaseClient.from("orders").insert({
        user_id: userId,
        email,
        product_id: dbSub.product_id,
        amount: dbSub.amount,
        currency: dbSub.currency,
        payment_provider: "paypal",
        provider_payment_id: subscriptionId,
        status: "completed",
        customer_name: customerName,
        subscription_id: dbSub.id,
        coupon_code: dbSub.coupon_code,
        coupon_discount: dbSub.coupon_discount,
      });

      if (orderError) {
        logStep("Order creation error", orderError);
      } else {
        logStep("Order created");
      }
    }

    return new Response(
      JSON.stringify({ success: true, subscriptionId: dbSub.id, userId }),
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
