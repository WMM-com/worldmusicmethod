import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Agora token privileges
const Privileges = {
  kJoinChannel: 1,
  kPublishAudioStream: 2,
  kPublishVideoStream: 3,
  kPublishDataStream: 4,
};

// Simple token builder implementation for RTC tokens
// Based on Agora's token generation algorithm
function buildToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: string,
  role: number,
  privilegeExpiredTs: number
): string {
  const version = "007";
  const randomInt = Math.floor(Math.random() * 0xFFFFFFFF);
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Build the message
  const message = buildMessage(uid, timestamp, randomInt, privilegeExpiredTs, role);
  
  // Sign the message
  const signature = sign(appCertificate, appId, channelName, uid, message);
  
  // Pack the token
  const content = packContent(signature, randomInt, timestamp, message);
  
  return version + base64Encode(content);
}

function buildMessage(
  uid: string,
  timestamp: number,
  salt: number,
  privilegeExpiredTs: number,
  role: number
): Uint8Array {
  const buffer = new ArrayBuffer(256);
  const view = new DataView(buffer);
  let offset = 0;
  
  // Salt
  view.setUint32(offset, salt, true);
  offset += 4;
  
  // Timestamp
  view.setUint32(offset, timestamp, true);
  offset += 4;
  
  // Privilege map size (4 privileges for publisher)
  const privileges: Record<number, number> = {};
  privileges[Privileges.kJoinChannel] = privilegeExpiredTs;
  if (role === 1) { // Publisher
    privileges[Privileges.kPublishAudioStream] = privilegeExpiredTs;
    privileges[Privileges.kPublishVideoStream] = privilegeExpiredTs;
    privileges[Privileges.kPublishDataStream] = privilegeExpiredTs;
  }
  
  const privilegeCount = Object.keys(privileges).length;
  view.setUint16(offset, privilegeCount, true);
  offset += 2;
  
  // Write privileges
  for (const [key, value] of Object.entries(privileges)) {
    view.setUint16(offset, parseInt(key), true);
    offset += 2;
    view.setUint32(offset, value, true);
    offset += 4;
  }
  
  return new Uint8Array(buffer, 0, offset);
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

function sign(
  appCertificate: string,
  appId: string,
  channelName: string,
  uid: string,
  message: Uint8Array
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const content = new Uint8Array([
    ...encoder.encode(appId),
    ...encoder.encode(channelName),
    ...encoder.encode(uid),
    ...message,
  ]);
  return hmacSha256(encoder.encode(appCertificate), content);
}

async function packContent(
  signaturePromise: Promise<Uint8Array>,
  salt: number,
  timestamp: number,
  message: Uint8Array
): Promise<Uint8Array> {
  const signature = await signaturePromise;
  const buffer = new ArrayBuffer(512);
  const view = new DataView(buffer);
  let offset = 0;
  
  // Signature length and data
  view.setUint16(offset, signature.length, true);
  offset += 2;
  new Uint8Array(buffer, offset, signature.length).set(signature);
  offset += signature.length;
  
  // Salt
  view.setUint32(offset, salt, true);
  offset += 4;
  
  // Timestamp
  view.setUint32(offset, timestamp, true);
  offset += 4;
  
  // Message length and data
  view.setUint16(offset, message.length, true);
  offset += 2;
  new Uint8Array(buffer, offset, message.length).set(message);
  offset += message.length;
  
  return new Uint8Array(buffer, 0, offset);
}

function base64Encode(data: Uint8Array | Promise<Uint8Array>): string | Promise<string> {
  if (data instanceof Promise) {
    return data.then(d => btoa(String.fromCharCode(...d)));
  }
  return btoa(String.fromCharCode(...data));
}

// Alternative: Use AccessToken2 format which is more widely supported
function generateRtcToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: string,
  role: "publisher" | "subscriber",
  tokenExpirationInSeconds: number
): Promise<string> {
  const roleValue = role === "publisher" ? 1 : 2;
  const privilegeExpiredTs = Math.floor(Date.now() / 1000) + tokenExpirationInSeconds;
  
  return (async () => {
    const version = "007";
    const randomInt = Math.floor(Math.random() * 0xFFFFFFFF);
    const timestamp = Math.floor(Date.now() / 1000);
    
    const message = buildMessage(uid, timestamp, randomInt, privilegeExpiredTs, roleValue);
    const signature = await sign(appCertificate, appId, channelName, uid, message);
    const content = await packContent(Promise.resolve(signature), randomInt, timestamp, message);
    
    return version + btoa(String.fromCharCode(...content));
  })();
}

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

    if (!appId || !appCertificate) {
      console.error("[AGORA-TOKEN] Missing Agora credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the user's Supabase ID as the UID if not provided
    const agoraUid = uid || userId;
    
    // Token expires in 1 hour (3600 seconds)
    const tokenExpirationInSeconds = 3600;

    console.log("[AGORA-TOKEN] Generating token for channel:", channelName, "uid:", agoraUid, "role:", role);

    // Generate the token
    const rtcToken = await generateRtcToken(
      appId,
      appCertificate,
      channelName,
      String(agoraUid),
      role as "publisher" | "subscriber",
      tokenExpirationInSeconds
    );

    console.log("[AGORA-TOKEN] Token generated successfully");

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
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
