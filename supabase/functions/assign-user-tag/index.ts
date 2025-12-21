import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ASSIGN-USER-TAG] ${step}${detailsStr}`);
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

    const { userId, email, tagId, tagName, source, sourceId } = await req.json();
    logStep("Request body", { userId, email, tagId, tagName, source });

    if (!tagId && !tagName) {
      throw new Error("Either tagId or tagName is required");
    }

    if (!userId && !email) {
      throw new Error("Either userId or email is required");
    }

    // Resolve tag ID if only name provided
    let resolvedTagId = tagId;
    if (!resolvedTagId && tagName) {
      const { data: tag, error: tagError } = await supabase
        .from("email_tags")
        .select("id")
        .eq("name", tagName)
        .single();

      if (tagError || !tag) {
        throw new Error(`Tag not found: ${tagName}`);
      }
      resolvedTagId = tag.id;
    }

    // Upsert user tag
    const tagData: Record<string, any> = {
      tag_id: resolvedTagId,
      source: source || "manual",
      source_id: sourceId || null,
      assigned_at: new Date().toISOString(),
    };

    if (userId) {
      tagData.user_id = userId;
    }
    if (email) {
      tagData.email = email.toLowerCase();
    }

    const { error: insertError } = await supabase
      .from("user_tags")
      .upsert(tagData, {
        onConflict: userId ? "user_id,tag_id" : "email,tag_id",
        ignoreDuplicates: true,
      });

    if (insertError) {
      throw new Error(`Failed to assign tag: ${insertError.message}`);
    }

    logStep("Tag assigned successfully", { tagId: resolvedTagId, userId, email });

    // Check if this tag triggers any sequences
    const { data: sequences } = await supabase
      .from("email_sequences")
      .select("id")
      .eq("trigger_type", "tag_added")
      .eq("is_active", true)
      .contains("trigger_config", { tag_id: resolvedTagId });

    if (sequences && sequences.length > 0) {
      logStep("Found sequences triggered by this tag", { count: sequences.length });
      
      // Get or create contact
      let contactId: string | null = null;
      if (email) {
        const { data: contact } = await supabase
          .from("email_contacts")
          .select("id")
          .eq("email", email.toLowerCase())
          .maybeSingle();
        contactId = contact?.id || null;
      }

      for (const seq of sequences) {
        // Check if already enrolled
        const { data: existing } = await supabase
          .from("email_sequence_enrollments")
          .select("id, status")
          .eq("sequence_id", seq.id)
          .or(`user_id.eq.${userId},email.eq.${email?.toLowerCase()}`)
          .maybeSingle();

        if (!existing || existing.status === "completed") {
          const { data: firstStep } = await supabase
            .from("email_sequence_steps")
            .select("delay_minutes")
            .eq("sequence_id", seq.id)
            .order("step_order")
            .limit(1)
            .single();

          const delayMinutes = firstStep?.delay_minutes || 0;
          const nextEmailAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

          await supabase
            .from("email_sequence_enrollments")
            .insert({
              sequence_id: seq.id,
              contact_id: contactId,
              user_id: userId || null,
              email: email?.toLowerCase() || "",
              status: "active",
              current_step: 0,
              next_email_at: nextEmailAt,
              metadata: { source: "tag_added", tag_id: resolvedTagId },
            });

          logStep("Enrolled in tag-triggered sequence", { sequenceId: seq.id });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
