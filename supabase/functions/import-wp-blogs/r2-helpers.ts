// AWS Signature V4 helpers for direct R2 uploads

export async function sha256Hex(data: Uint8Array | string): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof data === 'string') {
    buffer = new TextEncoder().encode(data).buffer.slice(0) as ArrayBuffer;
  } else {
    buffer = data.buffer.slice(0) as ArrayBuffer;
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const keyBuffer = key instanceof Uint8Array ? (key.buffer as ArrayBuffer) : key;
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

export async function hmacSha256Hex(key: ArrayBuffer, data: string): Promise<string> {
  const buffer = await hmacSha256(key, data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getSignatureKey(
  key: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode('AWS4' + key).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return await hmacSha256(kService, 'aws4_request');
}

/**
 * Upload binary data directly to R2 using S3-compatible PUT.
 * Returns the public URL on success, null on failure.
 */
export async function uploadToR2(
  objectKey: string,
  body: Uint8Array,
  contentType: string,
): Promise<string | null> {
  const accountId = Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID');
  const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  const bucketName = Deno.env.get('CLOUDFLARE_R2_ADMIN_BUCKET');
  const publicUrl = Deno.env.get('CLOUDFLARE_R2_ADMIN_PUBLIC_URL');

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    console.error('[R2] Missing R2 configuration');
    return null;
  }

  const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const url = `${r2Endpoint}/${bucketName}/${objectKey}`;

  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const payloadHash = await sha256Hex(body);

  const canonicalUri = `/${bucketName}/${objectKey}`;
  const canonicalQueryString = '';
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${accountId}.r2.cloudflarestorage.com\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = ['PUT', canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest)),
  ].join('\n');

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacSha256Hex(signingKey, stringToSign);

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        Host: `${accountId}.r2.cloudflarestorage.com`,
        'X-Amz-Content-Sha256': payloadHash,
        'X-Amz-Date': amzDate,
        Authorization: authorization,
      },
      body,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[R2] Upload failed (${resp.status}): ${errText}`);
      return null;
    }

    return `${publicUrl}/${objectKey}`;
  } catch (err) {
    console.error('[R2] Upload error:', err);
    return null;
  }
}

/**
 * Download an image from a URL, upload to R2, return the new public URL.
 * Falls back to null on any failure.
 */
export async function downloadAndUploadToR2(
  sourceUrl: string,
  r2Key: string,
): Promise<string | null> {
  try {
    console.log(`[R2] Downloading: ${sourceUrl}`);
    const resp = await fetch(sourceUrl, { redirect: 'follow' });
    if (!resp.ok) {
      console.error(`[R2] Download failed (${resp.status}): ${sourceUrl}`);
      return null;
    }

    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await resp.arrayBuffer();
    const body = new Uint8Array(arrayBuffer);

    console.log(`[R2] Uploading ${body.length} bytes as ${r2Key}`);
    return await uploadToR2(r2Key, body, contentType);
  } catch (err) {
    console.error(`[R2] Download+upload error for ${sourceUrl}:`, err);
    return null;
  }
}
