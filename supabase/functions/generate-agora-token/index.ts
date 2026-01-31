import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Agora Access Token 2 (007) implementation for Deno
// Based on the official Agora token specification

const VERSION = "007";
const VERSION_LENGTH = 3;

// Service types
const ServiceRtc = 1;

// RTC privileges
const PrivilegeJoinChannel = 1;
const PrivilegePublishAudioStream = 2;
const PrivilegePublishVideoStream = 3;
const PrivilegePublishDataStream = 4;

class ByteBuf {
  private buffer: number[] = [];

  putUint16(v: number): this {
    this.buffer.push(v & 0xff);
    this.buffer.push((v >> 8) & 0xff);
    return this;
  }

  putUint32(v: number): this {
    this.buffer.push(v & 0xff);
    this.buffer.push((v >> 8) & 0xff);
    this.buffer.push((v >> 16) & 0xff);
    this.buffer.push((v >> 24) & 0xff);
    return this;
  }

  putBytes(bytes: Uint8Array): this {
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  putString(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    this.putUint16(bytes.length);
    return this.putBytes(bytes);
  }

  putTreeMapUint32(map: Map<number, number>): this {
    // Sort by key for deterministic output
    const sortedEntries = [...map.entries()].sort((a, b) => a[0] - b[0]);
    this.putUint16(sortedEntries.length);
    for (const [key, value] of sortedEntries) {
      this.putUint16(key);
      this.putUint32(value);
    }
    return this;
  }

  pack(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
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
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

class AccessToken {
  appId: string;
  appCertificate: string;
  issueTs: number;
  expire: number;
  salt: number;
  services: Map<number, Service>;

  constructor(appId: string, appCertificate: string, expire: number) {
    this.appId = appId;
    this.appCertificate = appCertificate;
    this.issueTs = Math.floor(Date.now() / 1000);
    this.expire = expire;
    this.salt = Math.floor(Math.random() * 0xffffffff);
    this.services = new Map();
  }

  addService(service: Service): void {
    this.services.set(service.getServiceType(), service);
  }

  private packSigning(): Uint8Array {
    const buf = new ByteBuf();
    buf.putUint32(this.salt);
    buf.putUint32(this.issueTs);
    buf.putUint32(this.expire);
    
    // Pack services count
    buf.putUint16(this.services.size);
    
    // Sort services by type for deterministic output
    const sortedServices = [...this.services.entries()].sort((a, b) => a[0] - b[0]);
    
    for (const [serviceType, service] of sortedServices) {
      buf.putUint16(serviceType);
      const serviceData = service.pack();
      buf.putUint16(serviceData.length);
      buf.putBytes(serviceData);
    }
    
    return buf.pack();
  }

  async build(): Promise<string> {
    const encoder = new TextEncoder();
    const signing = this.packSigning();
    
    // Build signature: HMAC chain
    // sign = HMAC(HMAC(appCertificate, appId), signing)
    const step1 = await hmacSha256(encoder.encode(this.appCertificate), encoder.encode(this.appId));
    const signature = await hmacSha256(step1, signing);
    
    // Pack final token
    const buf = new ByteBuf();
    buf.putBytes(signature);
    buf.putUint32(this.salt);
    buf.putUint32(this.issueTs);
    buf.putUint32(this.expire);
    
    // Pack services
    buf.putUint16(this.services.size);
    const sortedServices = [...this.services.entries()].sort((a, b) => a[0] - b[0]);
    
    for (const [serviceType, service] of sortedServices) {
      buf.putUint16(serviceType);
      const serviceData = service.pack();
      buf.putUint16(serviceData.length);
      buf.putBytes(serviceData);
    }
    
    const content = buf.pack();
    const contentBase64 = encodeBase64(content);
    
    return VERSION + this.appId + contentBase64;
  }
}

interface Service {
  getServiceType(): number;
  pack(): Uint8Array;
}

class ServiceRtcImpl implements Service {
  channelName: string;
  uid: string;
  privileges: Map<number, number>;

  constructor(channelName: string, uid: string) {
    this.channelName = channelName;
    this.uid = uid;
    this.privileges = new Map();
  }

  getServiceType(): number {
    return ServiceRtc;
  }

  addPrivilege(privilege: number, expireTimestamp: number): void {
    this.privileges.set(privilege, expireTimestamp);
  }

  pack(): Uint8Array {
    const buf = new ByteBuf();
    buf.putString(this.channelName);
    buf.putString(this.uid);
    buf.putTreeMapUint32(this.privileges);
    return buf.pack();
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
  const accessToken = new AccessToken(appId, appCertificate, tokenExpire);
  
  const uidStr = uid === 0 ? "" : String(uid);
  const serviceRtc = new ServiceRtcImpl(channelName, uidStr);
  
  const currentTs = Math.floor(Date.now() / 1000);
  const privilegeExpireTs = currentTs + privilegeExpire;
  
  serviceRtc.addPrivilege(PrivilegeJoinChannel, privilegeExpireTs);
  
  if (role === 1) { // Publisher
    serviceRtc.addPrivilege(PrivilegePublishAudioStream, privilegeExpireTs);
    serviceRtc.addPrivilege(PrivilegePublishVideoStream, privilegeExpireTs);
    serviceRtc.addPrivilege(PrivilegePublishDataStream, privilegeExpireTs);
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
