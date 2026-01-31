import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { token } = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("[CONSUME-AUTH-TOKEN] Attempting to consume token");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Consume the one-time token and get user_id
    const { data: userId, error: rpcError } = await supabaseClient.rpc(
      'consume_payment_auth_token',
      { p_token: token }
    );

    if (rpcError) {
      console.error("[CONSUME-AUTH-TOKEN] RPC error:", rpcError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    if (!userId) {
      console.log("[CONSUME-AUTH-TOKEN] Token not found or already used");
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    console.log("[CONSUME-AUTH-TOKEN] Token consumed successfully", { userId });

    // Generate a magic link for the user to sign in
    const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: '', // We'll get this from user lookup
      options: {
        redirectTo: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.supabase.co')}/auth/v1/callback`,
      },
    });

    // Get user email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      console.error("[CONSUME-AUTH-TOKEN] User lookup error:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Generate a session directly for the user
    // Since we've verified payment, we can create a session
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
    });

    if (sessionError || !sessionData) {
      console.error("[CONSUME-AUTH-TOKEN] Session generation error:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to generate session" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Return the magic link properties for client to verify
    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email: userData.user.email,
        // Return token hash for OTP verification
        tokenHash: sessionData.properties?.hashed_token,
        verifyType: 'magiclink',
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CONSUME-AUTH-TOKEN] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
