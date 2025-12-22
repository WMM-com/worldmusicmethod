import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteMessageRequest {
  messageId: string;
}

// AWS S3/R2 Delete implementation
async function deleteFromR2(
  objectKey: string,
  bucket: string,
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';

  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${objectKey}`);

  const headers = new Headers({
    'Host': url.host,
    'X-Amz-Date': amzDate,
    'X-Amz-Content-Sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  });

  const canonicalUri = `/${bucket}/${objectKey}`;
  const canonicalQueryString = '';
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  
  const canonicalHeaders = 
    `host:${url.host}\n` +
    `x-amz-content-sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n` +
    `x-amz-date:${amzDate}\n`;

  const canonicalRequest = [
    'DELETE',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  
  const canonicalRequestHash = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHashHex,
  ].join('\n');

  const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
    const kDate = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', encoder.encode('AWS4' + key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode(dateStamp)
    );
    const kRegion = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', kDate, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode(regionName)
    );
    const kService = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode(serviceName)
    );
    return await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode('aws4_request')
    );
  };

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', signingKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode(stringToSign)
  );
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;
  headers.set('Authorization', authorizationHeader);

  try {
    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers,
    });
    return response.ok || response.status === 404;
  } catch (error) {
    console.error('R2 delete error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messageId }: DeleteMessageRequest = await req.json();

    if (!messageId) {
      return new Response(
        JSON.stringify({ error: 'Missing messageId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the message
    const { data: message, error: msgError } = await adminClient
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only sender can delete messages
    if (message.sender_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Only the sender can delete this message' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete media if present
    if (message.metadata?.mediaUrl) {
      const accountId = Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID');
      const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
      const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
      const bucket = Deno.env.get('CLOUDFLARE_R2_USER_BUCKET');

      if (accountId && accessKeyId && secretAccessKey && bucket) {
        const mediaUrl = message.metadata.mediaUrl;
        const publicUrl = Deno.env.get('CLOUDFLARE_R2_USER_PUBLIC_URL') || '';
        const objectKey = mediaUrl.replace(publicUrl + '/', '');
        
        console.log(`Deleting media from R2: ${objectKey}`);
        await deleteFromR2(objectKey, bucket, accountId, accessKeyId, secretAccessKey);
      }
    }

    // Hard delete the message
    const { error: deleteError } = await adminClient
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Message ${messageId} deleted by sender ${user.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
