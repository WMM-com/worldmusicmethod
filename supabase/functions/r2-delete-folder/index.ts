import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteFolderRequest {
  folderPrefix: string;
  bucket: "admin" | "user";
}

// Helper functions for AWS Signature V4
async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const buffer = typeof data === "string" 
    ? new TextEncoder().encode(data).buffer as ArrayBuffer
    : data.buffer.slice(0) as ArrayBuffer;
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode("AWS4" + key).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return await hmacSha256(kService, "aws4_request");
}

async function signRequest(
  method: string,
  url: URL,
  headers: Headers,
  payload: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  service: string
): Promise<void> {
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  
  const payloadHash = await sha256Hex(payload);
  headers.set("x-amz-date", amzDate);
  headers.set("x-amz-content-sha256", payloadHash);

  const signedHeadersList = Array.from(headers.keys()).sort();
  const signedHeaders = signedHeadersList.join(";");
  
  const canonicalHeaders = signedHeadersList
    .map(h => `${h}:${headers.get(h)?.trim()}\n`)
    .join("");

  const canonicalRequest = [
    method,
    url.pathname,
    url.search.slice(1),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  headers.set("Authorization", 
    `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  );
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

    // Only admins can delete folders
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

    const body: DeleteFolderRequest = await req.json();
    const { folderPrefix, bucket } = body;

    if (!folderPrefix || !bucket) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: folderPrefix, bucket" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const region = "auto";
    const service = "s3";
    
    let deletedCount = 0;
    let continuationToken: string | null = null;
    const errors: string[] = [];

    // List and delete all objects with the prefix
    do {
      // Build list URL with prefix
      const listParams = new URLSearchParams({
        "list-type": "2",
        prefix: folderPrefix,
        "max-keys": "1000",
      });
      if (continuationToken) {
        listParams.set("continuation-token", continuationToken);
      }

      const listUrl = new URL(`${r2Endpoint}/${bucketName}?${listParams.toString()}`);
      const listHeaders = new Headers({ host: listUrl.host });
      
      await signRequest("GET", listUrl, listHeaders, "", accessKeyId, secretAccessKey, region, service);

      const listResponse = await fetch(listUrl.toString(), {
        method: "GET",
        headers: listHeaders,
      });

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        console.error("R2 list error:", errorText);
        throw new Error("Failed to list objects");
      }

      const listXml = await listResponse.text();
      
      // Parse the XML response
      const keyMatches = [...listXml.matchAll(/<Key>([^<]+)<\/Key>/g)];
      const keys = keyMatches.map(m => m[1]);
      
      const truncatedMatch = listXml.match(/<IsTruncated>(\w+)<\/IsTruncated>/);
      const isTruncated = truncatedMatch?.[1] === "true";
      
      const tokenMatch = listXml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
      continuationToken = isTruncated && tokenMatch ? tokenMatch[1] : null;

      console.log(`Found ${keys.length} objects with prefix "${folderPrefix}"`);

      // Delete objects in batches (R2 supports up to 1000 per request)
      if (keys.length > 0) {
        const deleteXml = `<?xml version="1.0" encoding="UTF-8"?>
<Delete>
  <Quiet>true</Quiet>
  ${keys.map(key => `<Object><Key>${key}</Key></Object>`).join("\n  ")}
</Delete>`;

        const deleteUrl = new URL(`${r2Endpoint}/${bucketName}?delete=`);
        const deleteHeaders = new Headers({
          host: deleteUrl.host,
          "content-type": "application/xml",
        });
        
        // Calculate MD5 for the delete body
        const md5Buffer = await crypto.subtle.digest("MD5", new TextEncoder().encode(deleteXml));
        const md5Base64 = btoa(String.fromCharCode(...new Uint8Array(md5Buffer)));
        deleteHeaders.set("content-md5", md5Base64);
        
        await signRequest("POST", deleteUrl, deleteHeaders, deleteXml, accessKeyId, secretAccessKey, region, service);

        const deleteResponse = await fetch(deleteUrl.toString(), {
          method: "POST",
          headers: deleteHeaders,
          body: deleteXml,
        });

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          console.error("R2 batch delete error:", errorText);
          errors.push(`Batch delete failed: ${deleteResponse.status}`);
        } else {
          deletedCount += keys.length;
          console.log(`Deleted ${keys.length} objects`);
        }
      }
    } while (continuationToken);

    console.log(`Folder cleanup complete. Deleted ${deletedCount} objects from prefix "${folderPrefix}"`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        folderPrefix,
        bucket,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Delete folder error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
