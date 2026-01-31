import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deflate } from "npm:pako@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Agora AccessToken2 (007) implementation for Deno
// MUST match Agora official algorithm:
// token = "007" + base64(zlib.compress(packString(signature) + signingInfo))

const VERSION = "007";

// Service types
const SERVICE_RTC = 1;

// RTC privileges
const PRIVILEGE_JOIN_CHANNEL = 1;
const PRIVILEGE_PUBLISH_AUDIO = 2;
const PRIVILEGE_PUBLISH_VIDEO = 3;
const PRIVILEGE_PUBLISH_DATA = 4;

function packUint16(v: number): Uint8Array {
  const buf = new Uint8Array(2);
  buf[0] = v & 0xff;
  buf[1] = (v >> 8) & 0xff;
  return buf;
}

function packUint32(v: number): Uint8Array {
  const buf = new Uint8Array(4);
  buf[0] = v & 0xff;
  buf[1] = (v >> 8) & 0xff;
  buf[2] = (v >> 16) & 0xff;
  buf[3] = (v >> 24) & 0xff;
  return buf;
}

function packString(bytes: Uint8Array): Uint8Array {
  return concatBytes([packUint16(bytes.length), bytes]);
}

function packMapUint32(map: Map<number, number>): Uint8Array {
  const entries = [...map.entries()].sort((a, b) => a[0] - b[0]);
  const out: Uint8Array[] = [packUint16(entries.length)];
  for (const [k, v] of entries) {
    out.push(packUint16(k));
    out.push(packUint32(v));
  }
  return concatBytes(out);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  // Create fresh ArrayBuffer copies to satisfy TypeScript's BufferSource requirements
  const keyBuffer = new ArrayBuffer(key.length);
  new Uint8Array(keyBuffer).set(key);
  
  const dataBuffer = new ArrayBuffer(data.length);
  new Uint8Array(dataBuffer).set(data);
  
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

function encodeBase64(data: Uint8Array): string {
  // Avoid call stack limits by chunking.
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

interface Service {
  serviceType(): number;
  pack(): Uint8Array;
}

class ServiceRtc implements Service {
  private channelNameBytes: Uint8Array;
  private uidBytes: Uint8Array;
  private privileges = new Map<number, number>();

  constructor(channelName: string, uid: number) {
    const encoder = new TextEncoder();
    this.channelNameBytes = encoder.encode(channelName);
    // Agora spec: uid==0 means empty string uid
    this.uidBytes = uid === 0 ? new Uint8Array() : encoder.encode(String(uid));
  }

  serviceType(): number {
    return SERVICE_RTC;
  }

  addPrivilege(privilege: number, expireTimestamp: number): void {
    this.privileges.set(privilege, expireTimestamp);
  }

  pack(): Uint8Array {
    // Service.pack() + pack_string(channel) + pack_string(uid)
    return concatBytes([
      packUint16(this.serviceType()),
      packMapUint32(this.privileges),
      packString(this.channelNameBytes),
      packString(this.uidBytes),
    ]);
  }
}

class AccessToken2 {
  private appId: string;
  private appCertificate: string;
  private issueTs: number;
  private expire: number;
  private salt: number;
  private services = new Map<number, Service>();

  constructor(appId: string, appCertificate: string, expire: number) {
    this.appId = appId;
    this.appCertificate = appCertificate;
    this.issueTs = Math.floor(Date.now() / 1000);
    this.expire = expire;
    // Match Agora tools: random int 1..99999999
    this.salt = (crypto.getRandomValues(new Uint32Array(1))[0] % 99999999) + 1;
  }

  addService(service: Service): void {
    this.services.set(service.serviceType(), service);
  }

  private async signing(): Promise<Uint8Array> {
    // signing = HMAC(key=pack_uint32(issue_ts), msg=app_cert)
    // signing = HMAC(key=pack_uint32(salt), msg=signing)
    const encoder = new TextEncoder();
    const step1 = await hmacSha256(packUint32(this.issueTs), encoder.encode(this.appCertificate));
    return hmacSha256(packUint32(this.salt), step1);
  }

  async build(): Promise<string> {
    const encoder = new TextEncoder();

    // Basic validation
    if (!/^[a-f0-9]{32}$/i.test(this.appId) || !/^[a-f0-9]{32}$/i.test(this.appCertificate)) {
      return "";
    }
    if (this.services.size === 0) {
      return "";
    }

    const signing = await this.signing();

    // signing_info = pack_string(app_id) + issue_ts + expire + salt + service_count + services
    const signingInfoParts: Uint8Array[] = [
      packString(encoder.encode(this.appId)),
      packUint32(this.issueTs),
      packUint32(this.expire),
      packUint32(this.salt),
      packUint16(this.services.size),
    ];

    const sortedServiceTypes = [...this.services.keys()].sort((a, b) => a - b);
    for (const t of sortedServiceTypes) {
      signingInfoParts.push(this.services.get(t)!.pack());
    }
    const signingInfo = concatBytes(signingInfoParts);

    const signature = await hmacSha256(signing, signingInfo);
    const content = concatBytes([packString(signature), signingInfo]);

    // AccessToken2 uses zlib compression + base64
    const compressed = deflate(content);
    return VERSION + encodeBase64(compressed);
  }
}

function buildTokenWithUid(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  role: number,
  tokenExpire: number,
  privilegeExpire: number
): Promise<string> {
  const accessToken = new AccessToken2(appId, appCertificate, tokenExpire);

  const serviceRtc = new ServiceRtc(channelName, uid);

  const currentTs = Math.floor(Date.now() / 1000);
  const privilegeExpireTs = currentTs + privilegeExpire;

  serviceRtc.addPrivilege(PRIVILEGE_JOIN_CHANNEL, privilegeExpireTs);

  if (role === 1) {
    serviceRtc.addPrivilege(PRIVILEGE_PUBLISH_AUDIO, privilegeExpireTs);
    serviceRtc.addPrivilege(PRIVILEGE_PUBLISH_VIDEO, privilegeExpireTs);
    serviceRtc.addPrivilege(PRIVILEGE_PUBLISH_DATA, privilegeExpireTs);
  }

  accessToken.addService(serviceRtc);
  return accessToken.build();
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

    // Use service role for room lookups
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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

    const userId = claimsData.claims.sub as string;
    console.log("[AGORA-TOKEN] Authenticated user:", userId);

    // Parse request body
    const { channelName, uid, role = "publisher" } = await req.json();

    if (!channelName) {
      return new Response(
        JSON.stringify({ error: "channelName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Verify user has access to this channel/room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('video_rooms')
      .select('id, host_user_id, is_active')
      .eq('room_name', channelName)
      .maybeSingle();

    if (roomError) {
      console.log("[AGORA-TOKEN] Room lookup error:", roomError.message);
      return new Response(
        JSON.stringify({ error: "Failed to verify room access" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!room) {
      console.log("[AGORA-TOKEN] Room not found:", channelName);
      return new Response(
        JSON.stringify({ error: "Room not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!room.is_active) {
      console.log("[AGORA-TOKEN] Room is not active:", channelName);
      return new Response(
        JSON.stringify({ error: "Room is no longer active" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is host or an invited participant
    const isHost = room.host_user_id === userId;
    
    let isParticipant = false;
    if (!isHost) {
      const { data: participant } = await supabaseAdmin
        .from('room_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', userId)
        .maybeSingle();
      
      isParticipant = !!participant;
    }

    if (!isHost && !isParticipant) {
      console.log("[AGORA-TOKEN] User not authorized for room:", { userId, channelName, roomId: room.id });
      return new Response(
        JSON.stringify({ error: "Not authorized to join this room" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[AGORA-TOKEN] Room access verified:", { isHost, isParticipant, roomId: room.id });

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

    // IMPORTANT: The token must be generated for the exact UID used in client.join().
    // If uid is not provided (or 0), generate a unique numeric UID for this session.
    let agoraUid = 0;

    const generateUid = () => {
      const rand = crypto.getRandomValues(new Uint32Array(1))[0];
      // 1..2147483646
      return (rand % 2147483646) + 1;
    };

    if (uid === undefined || uid === null || uid === 0) {
      agoraUid = generateUid();
      console.log("[AGORA-TOKEN] Auto-generated UID:", agoraUid);
    } else {
      const parsed = parseInt(String(uid), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        agoraUid = parsed;
      } else {
        agoraUid = generateUid();
        console.log("[AGORA-TOKEN] Invalid UID provided; auto-generated UID:", agoraUid);
      }
    }
    
    // Role: 1 = publisher, 2 = subscriber
    const agoraRole = role === "subscriber" ? 2 : 1;
    
    // Token expires in 1 hour (3600 seconds)
    const tokenExpirationInSeconds = 3600;

    console.log("[AGORA-TOKEN] === TOKEN GENERATION ===");
    console.log("[AGORA-TOKEN] App ID:", `${appId.slice(0, 8)}...${appId.slice(-4)}`);
    console.log("[AGORA-TOKEN] Channel:", channelName);
    console.log("[AGORA-TOKEN] UID:", agoraUid);
    console.log("[AGORA-TOKEN] Role:", role);

    // Generate the RTC token
    const rtcToken = await buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      agoraUid,
      agoraRole,
      tokenExpirationInSeconds,
      tokenExpirationInSeconds
    );

    console.log("[AGORA-TOKEN] ✓ Token generated successfully");
    console.log("[AGORA-TOKEN] Token length:", rtcToken.length);
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
