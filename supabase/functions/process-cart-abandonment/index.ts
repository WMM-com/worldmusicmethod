import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-CART-ABANDONMENT] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { abandonmentId } = await req.json();
    logStep("Processing abandonment", { abandonmentId });

    if (!abandonmentId) {
      throw new Error("abandonmentId is required");
    }

    // Fetch abandonment record
    const { data: abandonment, error: abandonmentError } = await supabase
      .from("cart_abandonment")
      .select("*")
      .eq("id", abandonmentId)
      .single();

    if (abandonmentError || !abandonment) {
      throw new Error("Cart abandonment record not found");
    }

    // Skip if already recovered or email already sent
    if (abandonment.recovered_at) {
      logStep("Cart already recovered, skipping");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_recovered" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (abandonment.recovery_email_sent) {
      logStep("Recovery email already sent, skipping");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "email_already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = abandonment.email;
    const cartItems = abandonment.cart_items as any[];

    if (!email) {
      logStep("No email available, skipping");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already owns any of the courses in the cart
    const courseIds = cartItems
      .filter(item => item.productType === "course" || item.courseId)
      .map(item => item.courseId || item.course_id)
      .filter(Boolean);

    logStep("Checking course ownership", { email, courseIds });

    if (courseIds.length > 0) {
      // Check by user_id if available
      if (abandonment.user_id) {
        const { data: enrollments } = await supabase
          .from("course_enrollments")
          .select("course_id")
          .eq("user_id", abandonment.user_id)
          .eq("is_active", true)
          .in("course_id", courseIds);

        if (enrollments && enrollments.length > 0) {
          const ownedCourses = enrollments.map(e => e.course_id);
          logStep("User already owns some courses", { ownedCourses });

          // Remove owned courses from cart items
          const filteredItems = cartItems.filter(item => {
            const courseId = item.courseId || item.course_id;
            return !courseId || !ownedCourses.includes(courseId);
          });

          if (filteredItems.length === 0) {
            logStep("User owns all courses in cart, skipping email");
            // Mark as recovered since they already have everything
            await supabase
              .from("cart_abandonment")
              .update({ recovered_at: new Date().toISOString() })
              .eq("id", abandonmentId);

            return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_owns_courses" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      // Also check by email (for cases where they might have a different account)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (profile) {
        const { data: enrollments } = await supabase
          .from("course_enrollments")
          .select("course_id")
          .eq("user_id", profile.id)
          .eq("is_active", true)
          .in("course_id", courseIds);

        if (enrollments && enrollments.length === courseIds.length) {
          logStep("Email owner already has all courses, skipping");
          await supabase
            .from("cart_abandonment")
            .update({ recovered_at: new Date().toISOString() })
            .eq("id", abandonmentId);

          return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_owns_courses" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Find cart abandonment sequence
    const { data: sequence } = await supabase
      .from("email_sequences")
      .select("id")
      .eq("trigger_type", "cart_abandonment")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!sequence) {
      logStep("No active cart abandonment sequence found");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_sequence" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or get contact
    let contactId: string | null = null;
    const { data: existingContact } = await supabase
      .from("email_contacts")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact } = await supabase
        .from("email_contacts")
        .insert({
          email: email.toLowerCase(),
          source: "cart_abandonment",
        })
        .select("id")
        .single();

      contactId = newContact?.id || null;
    }

    // Get first step delay
    const { data: firstStep } = await supabase
      .from("email_sequence_steps")
      .select("delay_minutes")
      .eq("sequence_id", sequence.id)
      .order("step_order")
      .limit(1)
      .single();

    const delayMinutes = firstStep?.delay_minutes || 60; // Default 1 hour delay
    const nextEmailAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

    // Enroll in sequence
    const { data: enrollment, error: enrollError } = await supabase
      .from("email_sequence_enrollments")
      .insert({
        sequence_id: sequence.id,
        contact_id: contactId,
        user_id: abandonment.user_id,
        email: email.toLowerCase(),
        status: "active",
        current_step: 0,
        next_email_at: nextEmailAt,
        metadata: {
          source: "cart_abandonment",
          abandonment_id: abandonmentId,
          cart_items: cartItems,
          cart_total: abandonment.cart_total,
          currency: abandonment.currency,
        },
      })
      .select("id")
      .single();

    if (enrollError) {
      throw new Error(`Failed to enroll in sequence: ${enrollError.message}`);
    }

    // Update abandonment record
    await supabase
      .from("cart_abandonment")
      .update({
        recovery_email_sent: true,
        sequence_enrollment_id: enrollment.id,
      })
      .eq("id", abandonmentId);

    logStep("Cart abandonment processed successfully", { enrollmentId: enrollment.id });

    return new Response(JSON.stringify({ success: true, enrollmentId: enrollment.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
