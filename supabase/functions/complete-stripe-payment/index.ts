import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { email, full_name, product_id, product_type, course_id } = paymentIntent.metadata;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user exists
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
    const user = existingUser?.users?.find(u => u.email === email);

    let userId: string;

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
      console.log("[COMPLETE-STRIPE-PAYMENT] New user created", { userId });
    }

    // Create course enrollment if it's a course product
    if (product_type === "course" && course_id) {
      const { error: enrollError } = await supabaseClient
        .from("course_enrollments")
        .upsert({
          user_id: userId,
          course_id,
          enrollment_type: "purchase",
          is_active: true,
        }, {
          onConflict: "user_id,course_id",
        });

      if (enrollError) {
        console.error("[COMPLETE-STRIPE-PAYMENT] Enrollment error:", enrollError);
      } else {
        console.log("[COMPLETE-STRIPE-PAYMENT] Course enrollment created");
      }
    }

    // Mark any cart abandonment as recovered
    await supabaseClient
      .from("cart_abandonment")
      .update({ recovered_at: new Date().toISOString() })
      .or(`user_id.eq.${userId},email.eq.${email}`)
      .is("recovered_at", null);

    // Assign purchase tag
    try {
      // Get product name for tag
      const { data: product } = await supabaseClient
        .from("products")
        .select("name")
        .eq("id", product_id)
        .single();

      if (product) {
        // Find or create a purchase tag
        const tagName = `Purchased: ${product.name}`;
        let tagId: string;

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
              description: `Auto-created for ${product.name} purchases`,
              color: "#10B981",
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
              source_id: product_id,
            }, {
              onConflict: "user_id,tag_id",
              ignoreDuplicates: true,
            });
          console.log("[COMPLETE-STRIPE-PAYMENT] Purchase tag assigned", { tagId });
        }

        // Trigger purchase sequences
        const { data: purchaseSequences } = await supabaseClient
          .from("email_sequences")
          .select("id")
          .eq("trigger_type", "purchase")
          .eq("is_active", true);

        if (purchaseSequences && purchaseSequences.length > 0) {
          // Get or create contact
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
                metadata: { source: "purchase", product_id, course_id, product_name: product.name },
              });
            console.log("[COMPLETE-STRIPE-PAYMENT] Enrolled in purchase sequence", { sequenceId: seq.id });
          }
        }
      }
    } catch (tagError) {
      console.error("[COMPLETE-STRIPE-PAYMENT] Tag/sequence error (non-fatal):", tagError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        courseId: course_id,
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
