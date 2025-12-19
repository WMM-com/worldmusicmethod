import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteRequest {
  objectKey: string;
  bucket: "admin" | "user";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    const body: DeleteRequest = await req.json();
    const { objectKey, bucket } = body;

    // Validate inputs
    if (!objectKey || !bucket) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: objectKey, bucket" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["admin", "user"].includes(bucket)) {
      return new Response(
        JSON.stringify({ error: "Invalid bucket type. Must be 'admin' or 'user'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check permissions
    if (bucket === "admin") {
      // Admin bucket requires admin role
      const { data: roleData } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        return new Response(
          JSON.stringify({ error: "Admin access required for admin bucket" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // User bucket - verify the file belongs to the user
      // User files are stored with pattern: {userId}/...
      if (!objectKey.startsWith(`${user.id}/`)) {
        // Check if user is admin (admins can delete any user file)
        const { data: roleData } = await supabaseClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .single();

        if (!roleData) {
          return new Response(
            JSON.stringify({ error: "You can only delete your own files" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Get R2 credentials
    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
    
    const bucketName = bucket === "admin" 
      ? Deno.env.get("CLOUDFLARE_R2_ADMIN_BUCKET")
      : Deno.env.get("CLOUDFLARE_R2_USER_BUCKET");

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      console.error("Missing R2 configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // S3-compatible API endpoint for R2
    const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const url = `${r2Endpoint}/${bucketName}/${objectKey}`;

    // Create AWS Signature Version 4 for R2
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const region = "auto";
    const service = "s3";

    // Create canonical request for DELETE
    const method = "DELETE";
    const canonicalUri = `/${bucketName}/${objectKey}`;
    const canonicalQueryString = "";
    const payloadHash = await sha256Hex(new Uint8Array(0));
    
    const canonicalHeaders = [
      `host:${accountId}.r2.cloudflarestorage.com`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
    ].join("\n") + "\n";
    
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    // Create string to sign
    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      await sha256Hex(new TextEncoder().encode(canonicalRequest)),
    ].join("\n");

    // Calculate signature
    const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = await hmacSha256Hex(signingKey, stringToSign);

    // Create authorization header
    const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Delete from R2
    const deleteResponse = await fetch(url, {
      method: "DELETE",
      headers: {
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        "Authorization": authorizationHeader,
      },
    });

    if (!deleteResponse.ok && deleteResponse.status !== 204) {
      const errorText = await deleteResponse.text();
      console.error("R2 delete failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to delete file from storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`File deleted successfully: ${objectKey}`);

    return new Response(
      JSON.stringify({
        success: true,
        objectKey,
        bucket,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Delete error:", error);
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
