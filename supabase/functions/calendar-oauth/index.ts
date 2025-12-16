import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// OAuth configs for each provider
const getOAuthConfig = (provider: string) => {
  switch (provider) {
    case "google":
      return {
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientId: Deno.env.get("GOOGLE_CLIENT_ID"),
        clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
        scopes: ["https://www.googleapis.com/auth/calendar"],
      };
    case "outlook":
      return {
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        clientId: Deno.env.get("OUTLOOK_CLIENT_ID"),
        clientSecret: Deno.env.get("OUTLOOK_CLIENT_SECRET"),
        scopes: ["https://graph.microsoft.com/Calendars.ReadWrite", "offline_access"],
      };
    case "yahoo":
      return {
        authUrl: "https://api.login.yahoo.com/oauth2/request_auth",
        tokenUrl: "https://api.login.yahoo.com/oauth2/get_token",
        clientId: Deno.env.get("YAHOO_CLIENT_ID"),
        clientSecret: Deno.env.get("YAHOO_CLIENT_SECRET"),
        scopes: ["sdct-w"],
      };
    case "apple":
      return {
        authUrl: "https://appleid.apple.com/auth/authorize",
        tokenUrl: "https://appleid.apple.com/auth/token",
        clientId: Deno.env.get("APPLE_CLIENT_ID"),
        clientSecret: Deno.env.get("APPLE_CLIENT_SECRET"),
        scopes: ["name", "email"],
      };
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const provider = url.searchParams.get("provider");
    
    console.log(`Calendar OAuth action: ${action}, provider: ${provider}`);

    if (action === "authorize") {
      // Generate OAuth URL
      if (!provider) {
        throw new Error("Provider is required");
      }
      
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("No authorization header");
      }
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        throw new Error("Invalid token");
      }

      const config = getOAuthConfig(provider);
      if (!config.clientId) {
        throw new Error(`${provider} OAuth not configured. Please add ${provider.toUpperCase()}_CLIENT_ID to secrets.`);
      }

      const redirectUri = `${SUPABASE_URL}/functions/v1/calendar-oauth?action=callback&provider=${provider}`;
      const state = btoa(JSON.stringify({ userId: user.id, provider }));
      
      const authUrl = new URL(config.authUrl);
      authUrl.searchParams.set("client_id", config.clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", config.scopes.join(" "));
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      // Handle OAuth callback
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        console.error("OAuth error:", error);
        return new Response(
          `<html><body><script>window.opener.postMessage({type: 'calendar-oauth-error', error: '${error}'}, '*'); window.close();</script></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      if (!code || !state) {
        throw new Error("Missing code or state");
      }

      const { userId, provider: stateProvider } = JSON.parse(atob(state));
      const config = getOAuthConfig(stateProvider);
      const redirectUri = `${SUPABASE_URL}/functions/v1/calendar-oauth?action=callback&provider=${stateProvider}`;

      // Exchange code for tokens
      const tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId!,
          client_secret: config.clientSecret!,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText);
        throw new Error("Failed to exchange code for tokens");
      }

      const tokens = await tokenResponse.json();
      console.log("Tokens received for provider:", stateProvider);

      // Store connection in database
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const expiresAt = tokens.expires_in 
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      const { error: dbError } = await supabase
        .from("calendar_connections")
        .upsert({
          user_id: userId,
          provider: stateProvider,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: expiresAt,
          connected_at: new Date().toISOString(),
        }, { onConflict: "user_id,provider" });

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error("Failed to save connection");
      }

      return new Response(
        `<html><body><script>window.opener.postMessage({type: 'calendar-oauth-success', provider: '${stateProvider}'}, '*'); window.close();</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    if (action === "disconnect") {
      if (!provider) {
        throw new Error("Provider is required");
      }
      
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("No authorization header");
      }
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        throw new Error("Invalid token");
      }

      const { error: dbError } = await supabase
        .from("calendar_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);

      if (dbError) {
        throw new Error("Failed to disconnect");
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    console.error("Calendar OAuth error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
