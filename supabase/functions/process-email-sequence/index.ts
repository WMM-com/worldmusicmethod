import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-EMAIL-SEQUENCE] ${step}${detailsStr}`);
};

// Variable substitution helper
function substituteVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}

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

    // Find enrollments that are due for their next email
    const now = new Date().toISOString();
    const { data: dueEnrollments, error: enrollError } = await supabase
      .from("email_sequence_enrollments")
      .select(`
        *,
        sequence:email_sequences(*),
        contact:email_contacts(*)
      `)
      .eq("status", "active")
      .lte("next_email_at", now)
      .limit(50);

    if (enrollError) {
      throw new Error(`Failed to fetch enrollments: ${enrollError.message}`);
    }

    logStep("Found due enrollments", { count: dueEnrollments?.length || 0 });

    if (!dueEnrollments || dueEnrollments.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let errors = 0;

    for (const enrollment of dueEnrollments) {
      try {
        const sequence = enrollment.sequence;
        if (!sequence || !sequence.is_active) {
          logStep("Sequence inactive, pausing enrollment", { enrollmentId: enrollment.id });
          await supabase
            .from("email_sequence_enrollments")
            .update({ status: "paused" })
            .eq("id", enrollment.id);
          continue;
        }

        // Get next step
        const nextStepOrder = enrollment.current_step + 1;
        const { data: step, error: stepError } = await supabase
          .from("email_sequence_steps")
          .select(`
            *,
            template:email_sequence_templates(*)
          `)
          .eq("sequence_id", sequence.id)
          .eq("step_order", nextStepOrder)
          .single();

        if (stepError || !step) {
          // No more steps - mark as completed
          logStep("No more steps, completing enrollment", { enrollmentId: enrollment.id });
          await supabase
            .from("email_sequence_enrollments")
            .update({ status: "completed", completed_at: now })
            .eq("id", enrollment.id);
          continue;
        }

        const template = step.template;
        if (!template) {
          logStep("Template not found for step", { stepId: step.id });
          continue;
        }

        // Prepare variables for substitution
        const contact = enrollment.contact || {};
        const metadata = enrollment.metadata || {};
        const variables: Record<string, string> = {
          first_name: contact.first_name || "there",
          email: enrollment.email,
          course_name: metadata.course_name || "",
          cart_items: Array.isArray(metadata.cart_items) 
            ? metadata.cart_items.map((i: any) => i.name || i.productName).join(", ")
            : "",
          checkout_url: `${(Deno.env.get("SITE_URL") || "https://worldmusicmethod.com").replace(/\/$/, '')}/checkout`,
          unsubscribe_url: "#unsubscribe",
        };

        const subject = substituteVariables(template.subject, variables);
        const bodyHtml = substituteVariables(template.body_html, variables);

        // Send email using AWS SES
        logStep("Sending email", { to: enrollment.email, subject });

        const { error: sendError } = await supabase.functions.invoke("send-email-ses", {
          body: {
            to: enrollment.email,
            subject,
            html: bodyHtml,
            text: template.body_text ? substituteVariables(template.body_text, variables) : undefined,
          },
        });

        if (sendError) {
          throw new Error(`Failed to send email: ${sendError.message}`);
        }

        // Log sent email
        await supabase.from("email_send_log").insert({
          enrollment_id: enrollment.id,
          step_id: step.id,
          template_id: template.id,
          email: enrollment.email,
          subject,
          status: "sent",
        });

        // Calculate next email time
        const { data: nextStep } = await supabase
          .from("email_sequence_steps")
          .select("delay_minutes")
          .eq("sequence_id", sequence.id)
          .eq("step_order", nextStepOrder + 1)
          .single();

        const nextDelayMinutes = nextStep?.delay_minutes || null;
        const nextEmailAt = nextDelayMinutes 
          ? new Date(Date.now() + nextDelayMinutes * 60 * 1000).toISOString()
          : null;

        // Update enrollment
        await supabase
          .from("email_sequence_enrollments")
          .update({
            current_step: nextStepOrder,
            next_email_at: nextEmailAt,
            ...(nextEmailAt ? {} : { status: "completed", completed_at: now }),
          })
          .eq("id", enrollment.id);

        processed++;
        logStep("Email sent successfully", { enrollmentId: enrollment.id, step: nextStepOrder });
      } catch (err) {
        errors++;
        logStep("Error processing enrollment", { 
          enrollmentId: enrollment.id, 
          error: err instanceof Error ? err.message : String(err) 
        });
      }
    }

    logStep("Processing complete", { processed, errors });

    return new Response(JSON.stringify({ processed, errors }), {
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
