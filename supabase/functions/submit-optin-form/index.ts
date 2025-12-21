import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBMIT-OPTIN-FORM] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { formId, email, firstName } = await req.json();
    logStep("Request body", { formId, email, firstName });

    if (!formId || !email) {
      throw new Error("formId and email are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Fetch form configuration
    const { data: form, error: formError } = await supabase
      .from("optin_forms")
      .select("*")
      .eq("id", formId)
      .eq("is_active", true)
      .single();

    if (formError || !form) {
      throw new Error("Form not found or inactive");
    }
    logStep("Form fetched", { name: form.name });

    // Create or update contact
    const { data: existingContact } = await supabase
      .from("email_contacts")
      .select("id, is_subscribed, first_name")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    let contactId: string;

    if (existingContact) {
      // Update existing contact
      const { error: updateError } = await supabase
        .from("email_contacts")
        .update({
          first_name: firstName || existingContact.first_name || null,
          is_subscribed: true,
          unsubscribed_at: null,
        })
        .eq("id", existingContact.id);

      if (updateError) {
        logStep("Warning: Could not update contact", { error: updateError.message });
      }
      contactId = existingContact.id;
      logStep("Existing contact updated", { contactId });
    } else {
      // Create new contact
      const { data: newContact, error: createError } = await supabase
        .from("email_contacts")
        .insert({
          email: email.toLowerCase(),
          first_name: firstName || null,
          source: `form:${form.name}`,
        })
        .select("id")
        .single();

      if (createError) {
        throw new Error(`Failed to create contact: ${createError.message}`);
      }
      contactId = newContact.id;
      logStep("New contact created", { contactId });
    }

    // Log form submission
    const { error: submissionError } = await supabase
      .from("optin_form_submissions")
      .insert({
        form_id: formId,
        contact_id: contactId,
        email: email.toLowerCase(),
        form_data: { firstName },
      });

    if (submissionError) {
      logStep("Warning: Could not log submission", { error: submissionError.message });
    }

    // Assign tags from form configuration
    const tagsToAssign = form.tags_to_assign || [];
    if (tagsToAssign.length > 0) {
      for (const tagId of tagsToAssign) {
        const { error: tagError } = await supabase
          .from("user_tags")
          .upsert({
            email: email.toLowerCase(),
            tag_id: tagId,
            source: "form_submit",
            source_id: formId,
          }, {
            onConflict: "email,tag_id",
            ignoreDuplicates: true,
          });

        if (tagError) {
          logStep("Warning: Could not assign tag", { tagId, error: tagError.message });
        }
      }
      logStep("Tags assigned", { count: tagsToAssign.length });
    }

    // Enroll in sequence if configured
    if (form.sequence_id) {
      const { data: sequence } = await supabase
        .from("email_sequences")
        .select("id, is_active")
        .eq("id", form.sequence_id)
        .eq("is_active", true)
        .single();

      if (sequence) {
        // Check if already enrolled
        const { data: existingEnrollment } = await supabase
          .from("email_sequence_enrollments")
          .select("id, status")
          .eq("sequence_id", sequence.id)
          .eq("email", email.toLowerCase())
          .maybeSingle();

        if (!existingEnrollment || existingEnrollment.status === "completed") {
          // Get first step to calculate next_email_at
          const { data: firstStep } = await supabase
            .from("email_sequence_steps")
            .select("delay_minutes")
            .eq("sequence_id", sequence.id)
            .order("step_order")
            .limit(1)
            .single();

          const delayMinutes = firstStep?.delay_minutes || 0;
          const nextEmailAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

          const { error: enrollError } = await supabase
            .from("email_sequence_enrollments")
            .insert({
              sequence_id: sequence.id,
              contact_id: contactId,
              email: email.toLowerCase(),
              status: "active",
              current_step: 0,
              next_email_at: nextEmailAt,
              metadata: { source: "form_submit", form_id: formId },
            });

          if (enrollError) {
            logStep("Warning: Could not enroll in sequence", { error: enrollError.message });
          } else {
            logStep("Enrolled in sequence", { sequenceId: sequence.id });
          }
        } else {
          logStep("Already enrolled in sequence", { existingStatus: existingEnrollment.status });
        }
      }
    }

    logStep("Form submission completed successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
