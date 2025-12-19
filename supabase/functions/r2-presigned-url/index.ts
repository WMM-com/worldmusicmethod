import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  bucket: "admin" | "user";
  folder?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PresignedUrlRequest = await req.json();
    const { fileName, fileType, fileSize, bucket, folder } = body;

    if (!fileName || !fileType || !fileSize || !bucket) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["admin", "user"].includes(bucket)) {
      return new Response(
        JSON.stringify({ error: "Invalid bucket type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin permission for admin bucket
    if (bucket === "admin") {
      const { data: roleData } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Sanitize file name
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    
    // Get R2 credentials
    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
    
    const bucketName = bucket === "admin" 
      ? Deno.env.get("CLOUDFLARE_R2_ADMIN_BUCKET")
      : Deno.env.get("CLOUDFLARE_R2_USER_BUCKET");
    
    const publicUrl = bucket === "admin"
      ? Deno.env.get("CLOUDFLARE_R2_ADMIN_PUBLIC_URL")
      : Deno.env.get("CLOUDFLARE_R2_USER_PUBLIC_URL");

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
      console.error("Missing R2 configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construct object key
    const timestamp = Date.now();
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const folderPath = folder ? `${folder}/` : "";
    const objectKey = bucket === "user" 
      ? `${user.id}/${folderPath}${timestamp}-${uniqueId}-${sanitizedFileName}`
      : `${folderPath}${timestamp}-${uniqueId}-${sanitizedFileName}`;

    // Generate pre-signed URL (valid for 10 minutes)
    const expiresIn = 600;
    const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const region = "auto";
    const service = "s3";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    // Query parameters for pre-signed URL
    const queryParams = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": expiresIn.toString(),
      "X-Amz-SignedHeaders": "content-type;host",
    });

    const canonicalUri = `/${bucketName}/${objectKey}`;
    const canonicalQueryString = queryParams.toString().replace(/\+/g, "%20");
    
    const canonicalHeaders = [
      `content-type:${fileType}`,
      `host:${accountId}.r2.cloudflarestorage.com`,
    ].join("\n") + "\n";
    
    const signedHeaders = "content-type;host";
    
    // For pre-signed URLs, payload hash is UNSIGNED-PAYLOAD
    const canonicalRequest = [
      "PUT",
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      await sha256Hex(new TextEncoder().encode(canonicalRequest)),
    ].join("\n");

    const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = await hmacSha256Hex(signingKey, stringToSign);

    // Build final pre-signed URL
    queryParams.set("X-Amz-Signature", signature);
    const presignedUrl = `${r2Endpoint}${canonicalUri}?${queryParams.toString()}`;
    const finalUrl = `${publicUrl}/${objectKey}`;

    console.log(`Pre-signed URL generated for: ${objectKey}`);

    return new Response(
      JSON.stringify({
        success: true,
        uploadUrl: presignedUrl,
        publicUrl: finalUrl,
        objectKey,
        bucket,
        fileName: sanitizedFileName,
        fileType,
        expiresIn,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Pre-signed URL error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper functions for AWS Signature V4
async function sha256Hex(data: Uint8Array | string): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof data === "string") {
    buffer = new TextEncoder().encode(data).buffer.slice(0) as ArrayBuffer;
  } else {
    buffer = data.buffer.slice(0) as ArrayBuffer;
  }
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const keyBuffer = key instanceof Uint8Array ? key.buffer as ArrayBuffer : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function hmacSha256Hex(key: ArrayBuffer, data: string): Promise<string> {
  const buffer = await hmacSha256(key, data);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode("AWS4" + key).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return await hmacSha256(kService, "aws4_request");
}
