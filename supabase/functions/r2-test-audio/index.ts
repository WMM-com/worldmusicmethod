import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check – admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID")!;
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID")!;
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY")!;
    const bucketName = Deno.env.get("CLOUDFLARE_R2_ADMIN_BUCKET")!;
    const publicUrl = Deno.env.get("CLOUDFLARE_R2_ADMIN_PUBLIC_URL")!;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return new Response(
        JSON.stringify({ error: "Missing R2 configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    // ── ACTION: list ──────────────────────────────────────────────
    if (action === "list") {
      const prefix = body.prefix || "";
      const url = new URL(`/${bucketName}`, r2Endpoint);
      url.searchParams.set("list-type", "2");
      if (prefix) url.searchParams.set("prefix", prefix);
      url.searchParams.set("max-keys", "1000");

      const headers = await signRequest(
        "GET",
        url,
        accountId,
        accessKeyId,
        secretAccessKey,
        bucketName,
        new Uint8Array(0)
      );

      const response = await fetch(url.toString(), { method: "GET", headers });
      if (!response.ok) {
        const errText = await response.text();
        console.error("R2 list error:", errText);
        return new Response(
          JSON.stringify({ error: "Failed to list R2 files" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const xml = await response.text();

      // Parse XML for file keys
      const files: { key: string; size: number; lastModified: string; url: string }[] = [];
      const keyMatches = xml.matchAll(/<Key>([^<]+)<\/Key>/g);
      const sizeMatches = xml.matchAll(/<Size>([^<]+)<\/Size>/g);
      const dateMatches = xml.matchAll(/<LastModified>([^<]+)<\/LastModified>/g);

      const keys = [...keyMatches].map((m) => m[1]);
      const sizes = [...sizeMatches].map((m) => parseInt(m[1]));
      const dates = [...dateMatches].map((m) => m[1]);

      for (let i = 0; i < keys.length; i++) {
        // Only include audio files
        if (keys[i].match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
          files.push({
            key: keys[i],
            size: sizes[i] || 0,
            lastModified: dates[i] || "",
            url: `${publicUrl}/${keys[i]}`,
          });
        }
      }

      return new Response(JSON.stringify({ files, total: files.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: upload ────────────────────────────────────────────
    // Upload with exact filename (no timestamp/UUID prefix) for test audio
    if (action === "upload") {
      const { fileName, fileType, fileData, folder } = body;

      if (!fileName || !fileType || !fileData) {
        return new Response(
          JSON.stringify({ error: "Missing fileName, fileType, or fileData" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Preserve exact filename – only sanitize dangerous chars
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const folderPath = folder ? `${folder}/` : "";
      const objectKey = `${folderPath}${sanitizedFileName}`;

      const binaryData = Uint8Array.from(atob(fileData), (c) =>
        c.charCodeAt(0)
      );

      const uploadUrl = new URL(`/${bucketName}/${objectKey}`, r2Endpoint);
      const headers = await signRequest(
        "PUT",
        uploadUrl,
        accountId,
        accessKeyId,
        secretAccessKey,
        bucketName,
        binaryData,
        fileType
      );

      const uploadResponse = await fetch(uploadUrl.toString(), {
        method: "PUT",
        headers: { ...headers, "Content-Type": fileType },
        body: binaryData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("R2 upload failed:", errorText);
        return new Response(
          JSON.stringify({ error: "Upload failed" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const fileUrl = `${publicUrl}/${objectKey}`;
      console.log(`Test audio uploaded: ${objectKey}`);

      return new Response(
        JSON.stringify({ success: true, url: fileUrl, key: objectKey }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── ACTION: check-urls ────────────────────────────────────────
    // Check which audio URLs actually exist by doing HEAD requests
    if (action === "check-urls") {
      const { urls } = body;
      if (!Array.isArray(urls)) {
        return new Response(
          JSON.stringify({ error: "urls must be an array" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const results: Record<string, boolean> = {};
      // Check in batches of 10
      for (let i = 0; i < urls.length; i += 10) {
        const batch = urls.slice(i, i + 10);
        const checks = batch.map(async (url: string) => {
          try {
            const resp = await fetch(url, { method: "HEAD" });
            results[url] = resp.ok;
          } catch {
            results[url] = false;
          }
        });
        await Promise.all(checks);
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Unknown action. Use: list, upload, check-urls",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ── AWS Signature V4 helpers ────────────────────────────────────

async function sha256(data: Uint8Array | string): Promise<ArrayBuffer> {
  const encoded =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  return crypto.subtle.digest("SHA-256", encoded);
}

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const hash = await sha256(data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(
  key: ArrayBuffer | Uint8Array,
  data: string
): Promise<ArrayBuffer> {
  const keyBuffer = key instanceof Uint8Array ? key.buffer : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function hmacSha256Hex(
  key: ArrayBuffer,
  data: string
): Promise<string> {
  const buffer = await hmacSha256(key, data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(
    encoder.encode("AWS4" + key).buffer as ArrayBuffer,
    dateStamp
  );
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

async function signRequest(
  method: string,
  url: URL,
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucketName: string,
  payload: Uint8Array,
  contentType?: string
): Promise<Record<string, string>> {
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";
  const host = `${accountId}.r2.cloudflarestorage.com`;

  const payloadHash = await sha256Hex(payload);

  const headerEntries: [string, string][] = [
    ["host", host],
    ["x-amz-content-sha256", payloadHash],
    ["x-amz-date", amzDate],
  ];
  if (contentType) headerEntries.push(["content-type", contentType]);
  headerEntries.sort((a, b) => a[0].localeCompare(b[0]));

  const signedHeaders = headerEntries.map((h) => h[0]).join(";");
  const canonicalHeaders =
    headerEntries.map((h) => `${h[0]}:${h[1]}`).join("\n") + "\n";

  const canonicalUri = url.pathname;
  const canonicalQueryString = [...url.searchParams]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
    )
    .join("&");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest)),
  ].join("\n");

  const signingKey = await getSignatureKey(
    secretAccessKey,
    dateStamp,
    region,
    service
  );
  const signature = await hmacSha256Hex(signingKey, stringToSign);

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const result: Record<string, string> = {
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    Authorization: authorization,
  };
  if (contentType) result["Content-Type"] = contentType;
  return result;
}
