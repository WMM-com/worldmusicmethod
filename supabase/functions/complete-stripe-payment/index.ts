import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize identifiers to prevent filter injection
function sanitizeIdentifier(id: string): string {
  if (!id || typeof id !== 'string') return '';
  return id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36);
}

function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.replace(/[,()]/g, '').toLowerCase().slice(0, 255);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentIntentId, password } = await req.json();
    
    console.log("[COMPLETE-STRIPE-PAYMENT] Starting", { paymentIntentId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
    }

    console.log("[COMPLETE-STRIPE-PAYMENT] Payment verified", { status: paymentIntent.status });

    const { 
      email, 
      full_name, 
      product_ids, 
      product_details,
      currency,
      original_amount,
    } = paymentIntent.metadata;

    // Parse multi-product data
    let productIds: string[] = [];
    let productDetailsList: { id: string; name: string; course_id: string | null; amount: number }[] = [];
    
    try {
      productIds = product_ids ? JSON.parse(product_ids) : [];
      productDetailsList = product_details ? JSON.parse(product_details) : [];
    } catch (e) {
      console.log("[COMPLETE-STRIPE-PAYMENT] Legacy single product format detected");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user exists
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
    const user = existingUser?.users?.find(u => u.email === email);

    let userId: string;
    let isNewUser = false;
    let sessionToken: string | null = null;

    if (user) {
      userId = user.id;
      console.log("[COMPLETE-STRIPE-PAYMENT] Existing user found", { userId });
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log("[COMPLETE-STRIPE-PAYMENT] New user created", { userId });

      // Generate a session token for the new user so they stay logged in
      try {
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
          type: 'magiclink',
          email,
        });
        
        if (sessionData?.properties?.hashed_token) {
          sessionToken = sessionData.properties.hashed_token;
          console.log("[COMPLETE-STRIPE-PAYMENT] Session token generated for new user");
        }
      } catch (sessionErr) {
        console.log("[COMPLETE-STRIPE-PAYMENT] Could not generate session token (non-fatal):", sessionErr);
      }
    }

    // Create course enrollments for ALL products that are courses
    const courseIds: string[] = [];
    for (const detail of productDetailsList) {
      if (detail.course_id) {
        const { error: enrollError } = await supabaseClient
          .from("course_enrollments")
          .upsert({
            user_id: userId,
            course_id: detail.course_id,
            enrollment_type: "purchase",
            is_active: true,
          }, {
            onConflict: "user_id,course_id",
          });

        if (enrollError) {
          console.error("[COMPLETE-STRIPE-PAYMENT] Enrollment error for course:", detail.course_id, enrollError);
        } else {
          courseIds.push(detail.course_id);
          console.log("[COMPLETE-STRIPE-PAYMENT] Course enrollment created", { courseId: detail.course_id });
        }
      }
    }

    // Create order records for EACH product
    const paymentAmount = paymentIntent.amount / 100; // Convert from cents (this is the DISCOUNTED total)
    const paymentCurrency = (currency || paymentIntent.currency || 'USD').toUpperCase();
    
    // Calculate the total original amount to determine discount ratio
    const totalOriginalAmount = productDetailsList.reduce((sum, d) => sum + d.amount, 0);
    const discountRatio = totalOriginalAmount > 0 ? paymentAmount / totalOriginalAmount : 1;
    
    for (const detail of productDetailsList) {
      try {
        // Apply the proportional discount to each product's amount
        const discountedAmount = detail.amount * discountRatio;
        
        const { error: orderError } = await supabaseClient
          .from("orders")
          .insert({
            user_id: userId,
            email: email.toLowerCase(),
            product_id: detail.id,
            amount: discountedAmount, // Store the actual charged amount (after discount)
            currency: paymentCurrency,
            payment_provider: "stripe",
            provider_payment_id: paymentIntentId,
            status: "completed",
            customer_name: full_name,
          });

        if (orderError) {
          console.error("[COMPLETE-STRIPE-PAYMENT] Order creation error:", orderError);
        } else {
          console.log("[COMPLETE-STRIPE-PAYMENT] Order created for product:", detail.id, "amount:", discountedAmount);
        }
      } catch (orderErr) {
        console.error("[COMPLETE-STRIPE-PAYMENT] Order insert failed:", orderErr);
      }
    }

    // Mark any cart abandonment as recovered
    const safeUserId = userId ? sanitizeIdentifier(userId) : '';
    const safeEmail = email ? sanitizeEmail(email) : '';
    
    // Build filter parts safely
    const filterParts = [];
    if (safeUserId) filterParts.push(`user_id.eq.${safeUserId}`);
    if (safeEmail) filterParts.push(`email.eq.${safeEmail}`);
    
    if (filterParts.length > 0) {
      await supabaseClient
        .from("cart_abandonment")
        .update({ recovered_at: new Date().toISOString() })
        .or(filterParts.join(','))
        .is("recovered_at", null);
    }

    // Assign purchase tags for each product
    for (const detail of productDetailsList) {
      try {
        const tagName = `Purchased: ${detail.name}`;
        let tagId: string | undefined;

        const { data: existingTag } = await supabaseClient
          .from("email_tags")
          .select("id")
          .eq("name", tagName)
          .maybeSingle();

        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const { data: newTag } = await supabaseClient
            .from("email_tags")
            .insert({
              name: tagName,
              description: `Auto-created for ${detail.name} purchases`,
            })
            .select("id")
            .single();
          tagId = newTag?.id;
        }

        if (tagId) {
          await supabaseClient
            .from("user_tags")
            .upsert({
              user_id: userId,
              email: email?.toLowerCase(),
              tag_id: tagId,
              source: "purchase",
              source_id: detail.id,
            }, {
              onConflict: "user_id,tag_id",
              ignoreDuplicates: true,
            });
          console.log("[COMPLETE-STRIPE-PAYMENT] Purchase tag assigned", { tagId, product: detail.name });
        }
      } catch (tagError) {
        console.error("[COMPLETE-STRIPE-PAYMENT] Tag error (non-fatal):", tagError);
      }
    }

    // Trigger purchase sequences (once, not per product)
    try {
      const { data: purchaseSequences } = await supabaseClient
        .from("email_sequences")
        .select("id")
        .eq("trigger_type", "purchase")
        .eq("is_active", true);

      if (purchaseSequences && purchaseSequences.length > 0) {
        let contactId: string | null = null;
        const { data: contact } = await supabaseClient
          .from("email_contacts")
          .select("id")
          .eq("email", email.toLowerCase())
          .maybeSingle();
        contactId = contact?.id || null;

        for (const seq of purchaseSequences) {
          const { data: firstStep } = await supabaseClient
            .from("email_sequence_steps")
            .select("delay_minutes")
            .eq("sequence_id", seq.id)
            .order("step_order")
            .limit(1)
            .single();

          const nextEmailAt = new Date(Date.now() + (firstStep?.delay_minutes || 0) * 60 * 1000).toISOString();

          await supabaseClient
            .from("email_sequence_enrollments")
            .insert({
              sequence_id: seq.id,
              contact_id: contactId,
              user_id: userId,
              email: email.toLowerCase(),
              status: "active",
              current_step: 0,
              next_email_at: nextEmailAt,
              metadata: { 
                source: "purchase", 
                product_ids: productIds,
                course_ids: courseIds,
                product_names: productDetailsList.map(p => p.name),
              },
            });
          console.log("[COMPLETE-STRIPE-PAYMENT] Enrolled in purchase sequence", { sequenceId: seq.id });
        }
      }
    } catch (seqError) {
      console.error("[COMPLETE-STRIPE-PAYMENT] Sequence error (non-fatal):", seqError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        courseIds,
        isNewUser,
        email,
        password: isNewUser ? password : undefined, // Return password only for new users to allow auto-login
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[COMPLETE-STRIPE-PAYMENT] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
