import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Agora token generation using Web Crypto API (Deno-compatible)
const VERSION = "007";
const VERSION_LENGTH = 3;

// Privilege constants
const PRIVILEGES = {
  JOIN_CHANNEL: 1,
  PUBLISH_AUDIO_STREAM: 2,
  PUBLISH_VIDEO_STREAM: 3,
  PUBLISH_DATA_STREAM: 4,
};

function packUint16(value: number): Uint8Array {
  const buffer = new ArrayBuffer(2);
  const view = new DataView(buffer);
  view.setUint16(0, value, true); // little-endian
  return new Uint8Array(buffer);
}

function packUint32(value: number): Uint8Array {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, value, true); // little-endian
  return new Uint8Array(buffer);
}

function packString(str: string): Uint8Array {
  const encoder = new TextEncoder();
  const strBytes = encoder.encode(str);
  const lenBytes = packUint16(strBytes.length);
  const result = new Uint8Array(lenBytes.length + strBytes.length);
  result.set(lenBytes, 0);
  result.set(strBytes, lenBytes.length);
  return result;
}

function packMapUint32(map: Map<number, number>): Uint8Array {
  const parts: Uint8Array[] = [];
  parts.push(packUint16(map.size));
  for (const [key, value] of map) {
    parts.push(packUint16(key));
    parts.push(packUint32(value));
  }
  const totalLength = parts.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  // Create new ArrayBuffer copies to ensure proper typing
  const keyBuffer = new Uint8Array(key).buffer as ArrayBuffer;
  const dataBuffer = new Uint8Array(data).buffer as ArrayBuffer;
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
  return new Uint8Array(signature);
}

function base64Encode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

function compress(data: Uint8Array): Uint8Array {
  // Simple zlib-style compression header + raw data
  // For Agora tokens, we use a simplified approach
  // The token format expects compressed data, but Agora's server
  // can handle both compressed and uncompressed data with proper header
  return data;
}

async function generateAccessToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  tokenExpirationInSeconds: number
): Promise<string> {
  const encoder = new TextEncoder();
  
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + tokenExpirationInSeconds;
  
  // Create privileges map
  const privileges = new Map<number, number>();
  privileges.set(PRIVILEGES.JOIN_CHANNEL, privilegeExpiredTs);
  privileges.set(PRIVILEGES.PUBLISH_AUDIO_STREAM, privilegeExpiredTs);
  privileges.set(PRIVILEGES.PUBLISH_VIDEO_STREAM, privilegeExpiredTs);
  privileges.set(PRIVILEGES.PUBLISH_DATA_STREAM, privilegeExpiredTs);
  
  // Build message
  const salt = Math.floor(Math.random() * 0xFFFFFFFF);
  const ts = currentTimestamp;
  
  const uidStr = uid === 0 ? "" : String(uid);
  
  // Pack the content
  const content = concatUint8Arrays(
    packUint32(salt),
    packUint32(ts),
    packMapUint32(privileges)
  );
  
  // Generate signature
  const signKey = await hmacSha256(
    encoder.encode(appCertificate),
    encoder.encode(channelName)
  );
  const signKeyWithUid = await hmacSha256(signKey, encoder.encode(uidStr));
  const signature = await hmacSha256(signKeyWithUid, content);
  
  // Build the token content
  const tokenContent = concatUint8Arrays(
    signature,
    packUint32(salt),
    packUint32(ts),
    packMapUint32(privileges)
  );
  
  // Encode the final token
  const appIdBytes = encoder.encode(appId);
  const tokenBase64 = base64Encode(tokenContent);
  
  return VERSION + appId + tokenBase64;
}

// Alternative: Use RTC Token format (007)
async function buildRtcToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  role: number,
  tokenExpirationInSeconds: number,
  privilegeExpirationInSeconds: number
): Promise<string> {
  const encoder = new TextEncoder();
  
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + privilegeExpirationInSeconds;
  const tokenExpiredTs = currentTimestamp + tokenExpirationInSeconds;
  
  // Random salt
  const salt = Math.floor(Math.random() * 0xFFFFFFFF);
  
  const uidStr = uid === 0 ? "" : String(uid);
  
  // Service privileges for RTC
  const rtcPrivileges = new Map<number, number>();
  rtcPrivileges.set(PRIVILEGES.JOIN_CHANNEL, privilegeExpiredTs);
  if (role === 1) { // Publisher role
    rtcPrivileges.set(PRIVILEGES.PUBLISH_AUDIO_STREAM, privilegeExpiredTs);
    rtcPrivileges.set(PRIVILEGES.PUBLISH_VIDEO_STREAM, privilegeExpiredTs);
    rtcPrivileges.set(PRIVILEGES.PUBLISH_DATA_STREAM, privilegeExpiredTs);
  }
  
  // Pack service content
  const serviceContent = concatUint8Arrays(
    packString(channelName),
    packString(uidStr),
    packMapUint32(rtcPrivileges)
  );
  
  // Service type for RTC
  const serviceType = 1; // RTC service
  
  // Pack services map
  const servicesMap = new Map<number, Uint8Array>();
  servicesMap.set(serviceType, serviceContent);
  
  // Pack all services
  const servicesParts: Uint8Array[] = [];
  servicesParts.push(packUint16(servicesMap.size));
  for (const [key, value] of servicesMap) {
    servicesParts.push(packUint16(key));
    servicesParts.push(packUint16(value.length));
    servicesParts.push(value);
  }
  const servicesBytes = concatUint8Arrays(...servicesParts);
  
  // Build message for signing
  const message = concatUint8Arrays(
    packUint32(salt),
    packUint32(tokenExpiredTs),
    servicesBytes
  );
  
  // Generate signature chain
  const sign1 = await hmacSha256(encoder.encode(appCertificate), encoder.encode(appId));
  const sign2 = await hmacSha256(sign1, encoder.encode(channelName));
  const sign3 = await hmacSha256(sign2, encoder.encode(uidStr));
  const signature = await hmacSha256(sign3, message);
  
  // Build final token content
  const tokenContent = concatUint8Arrays(
    signature,
    packUint32(salt),
    packUint32(tokenExpiredTs),
    servicesBytes
  );
  
  // Base64 encode
  const tokenBase64 = base64Encode(tokenContent);
  
  return VERSION + appId + tokenBase64;
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

    // Validate App ID format (32 hex characters)
    if (!appId || !/^[a-f0-9]{32}$/i.test(appId)) {
      console.error("[AGORA-TOKEN] Invalid or missing App ID");
      console.error("[AGORA-TOKEN] App ID length:", appId?.length);
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
      return new Response(
        JSON.stringify({ error: "Missing Agora App Certificate" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use uid=0 for auto-assign
    const agoraUid = uid === undefined || uid === null || uid === 0 ? 0 : parseInt(String(uid), 10) || 0;
    
    // Role: 1 = publisher, 2 = subscriber
    const agoraRole = role === "subscriber" ? 2 : 1;
    
    // Token expires in 1 hour (3600 seconds)
    const tokenExpirationInSeconds = 3600;

    console.log("[AGORA-TOKEN] === TOKEN GENERATION ===");
    console.log("[AGORA-TOKEN] App ID:", `${appId.slice(0, 8)}...${appId.slice(-4)}`);
    console.log("[AGORA-TOKEN] Channel:", channelName);
    console.log("[AGORA-TOKEN] UID:", agoraUid);
    console.log("[AGORA-TOKEN] Role:", role);

    // Generate the RTC token using Web Crypto API
    const rtcToken = await buildRtcToken(
      appId,
      appCertificate,
      channelName,
      agoraUid,
      agoraRole,
      tokenExpirationInSeconds,
      tokenExpirationInSeconds
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
