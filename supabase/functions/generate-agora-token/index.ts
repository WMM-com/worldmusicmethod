import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RtcTokenBuilder, RtcRole } from "https://esm.sh/agora-token@2.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[AGORA-TOKEN] No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate the JWT and get claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.log("[AGORA-TOKEN] Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("[AGORA-TOKEN] Authenticated user:", userId);

    // Parse request body
    const { channelName, uid, role = "publisher" } = await req.json();

    if (!channelName) {
      return new Response(
        JSON.stringify({ error: "channelName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Agora credentials from environment
    const appId = Deno.env.get("AGORA_APP_ID");
    const appCertificate = Deno.env.get("AGORA_APP_CERTIFICATE");

    // Validate App ID format (32 hex characters)
    if (!appId || !/^[a-f0-9]{32}$/i.test(appId)) {
      console.error("[AGORA-TOKEN] Invalid or missing App ID");
      console.error("[AGORA-TOKEN] App ID length:", appId?.length);
      console.error("[AGORA-TOKEN] TROUBLESHOOTING:");
      console.error("  1. Go to Agora Console > Project Management");
      console.error("  2. Copy the exact App ID (32 hex characters)");
      console.error("  3. Update AGORA_APP_ID secret in Supabase");
      return new Response(
        JSON.stringify({ 
          error: "Invalid Agora App ID configuration",
          details: "App ID must be a 32-character hexadecimal string"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!appCertificate) {
      console.error("[AGORA-TOKEN] Missing App Certificate");
      console.error("[AGORA-TOKEN] TROUBLESHOOTING:");
      console.error("  1. Go to Agora Console > Project Management");
      console.error("  2. Click on your project > Features > App Certificate");
      console.error("  3. Enable Primary Certificate and copy the value");
      console.error("  4. Update AGORA_APP_CERTIFICATE secret in Supabase");
      return new Response(
        JSON.stringify({ error: "Missing Agora App Certificate" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use uid=0 for simplicity (avoids UID mismatch errors) or convert user ID to uint
    // When uid is 0, Agora generates a random UID on join
    const agoraUid = uid === undefined || uid === null || uid === 0 ? 0 : parseInt(String(uid), 10) || 0;
    
    // Determine role
    const agoraRole = role === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    
    // Token expires in 1 hour (3600 seconds)
    const tokenExpirationInSeconds = 3600;
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + tokenExpirationInSeconds;

    console.log("[AGORA-TOKEN] === TOKEN GENERATION ===");
    console.log("[AGORA-TOKEN] App ID:", `${appId.slice(0, 8)}...${appId.slice(-4)}`);
    console.log("[AGORA-TOKEN] Channel:", channelName);
    console.log("[AGORA-TOKEN] UID:", agoraUid);
    console.log("[AGORA-TOKEN] Role:", role);
    console.log("[AGORA-TOKEN] Expires:", new Date(privilegeExpiredTs * 1000).toISOString());

    // Generate the RTC token using official Agora library
    const rtcToken = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      agoraUid,
      agoraRole,
      tokenExpirationInSeconds,  // Token expiration
      tokenExpirationInSeconds   // Privilege expiration
    );

    console.log("[AGORA-TOKEN] ✓ Token generated successfully");
    console.log("[AGORA-TOKEN] Token preview:", `${rtcToken.slice(0, 20)}...`);

    return new Response(
      JSON.stringify({
        token: rtcToken,
        appId: appId,
        channel: channelName,
        uid: agoraUid,
        expiresIn: tokenExpirationInSeconds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[AGORA-TOKEN] Error:", message);
    console.error("[AGORA-TOKEN] Stack:", error instanceof Error ? error.stack : "N/A");
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
