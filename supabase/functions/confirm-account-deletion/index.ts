import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// R2 delete function
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
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  
  const canonicalHeaders = 
    `host:${url.host}\n` +
    `x-amz-content-sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n` +
    `x-amz-date:${amzDate}\n`;

  const canonicalRequest = [
    'DELETE',
    canonicalUri,
    '',
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

  const stringToSign = [algorithm, amzDate, credentialScope, canonicalRequestHashHex].join('\n');

  const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
    const kDate = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', encoder.encode('AWS4' + key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(dateStamp));
    const kRegion = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kDate, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(regionName));
    const kService = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(serviceName));
    return await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode('aws4_request'));
  };

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', signingKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(stringToSign));
  const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

  headers.set('Authorization', `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`);

  try {
    const response = await fetch(url.toString(), { method: 'DELETE', headers });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        '<html><body><h1>Invalid Request</h1><p>Missing confirmation token.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Find the deletion request
    const { data: request, error: reqError } = await adminClient
      .from('account_deletion_requests')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (reqError || !request) {
      return new Response(
        '<html><body style="font-family: sans-serif; text-align: center; padding: 50px;"><h1>Link Expired or Invalid</h1><p>This deletion link has expired or has already been used.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const userId = request.user_id;
    console.log(`Processing account deletion for user ${userId}`);

    // Update request status
    await adminClient
      .from('account_deletion_requests')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', request.id);

    // R2 credentials
    const accountId = Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID');
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const userBucket = Deno.env.get('CLOUDFLARE_R2_USER_BUCKET');
    const userPublicUrl = Deno.env.get('CLOUDFLARE_R2_USER_PUBLIC_URL') || '';

    // Delete user's media from R2
    // 1. Profile images
    const { data: profile } = await adminClient
      .from('profiles')
      .select('avatar_url, cover_image_url')
      .eq('id', userId)
      .single();

    if (profile && accountId && accessKeyId && secretAccessKey && userBucket) {
      if (profile.avatar_url?.includes(userPublicUrl)) {
        const key = profile.avatar_url.replace(userPublicUrl + '/', '');
        await deleteFromR2(key, userBucket, accountId, accessKeyId, secretAccessKey);
      }
      if (profile.cover_image_url?.includes(userPublicUrl)) {
        const key = profile.cover_image_url.replace(userPublicUrl + '/', '');
        await deleteFromR2(key, userBucket, accountId, accessKeyId, secretAccessKey);
      }
    }

    // 2. Gallery images
    const { data: gallery } = await adminClient
      .from('profile_gallery')
      .select('image_url')
      .eq('user_id', userId);

    if (gallery && accountId && accessKeyId && secretAccessKey && userBucket) {
      for (const item of gallery) {
        if (item.image_url?.includes(userPublicUrl)) {
          const key = item.image_url.replace(userPublicUrl + '/', '');
          await deleteFromR2(key, userBucket, accountId, accessKeyId, secretAccessKey);
        }
      }
    }

    // 3. Messages with media
    const { data: messages } = await adminClient
      .from('messages')
      .select('metadata')
      .eq('sender_id', userId);

    if (messages && accountId && accessKeyId && secretAccessKey && userBucket) {
      for (const msg of messages) {
        const mediaUrl = msg.metadata?.mediaUrl;
        if (mediaUrl?.includes(userPublicUrl)) {
          const key = mediaUrl.replace(userPublicUrl + '/', '');
          await deleteFromR2(key, userBucket, accountId, accessKeyId, secretAccessKey);
        }
      }
    }

    // 4. Posts with media
    const { data: posts } = await adminClient
      .from('posts')
      .select('image_url')
      .eq('user_id', userId);

    if (posts && accountId && accessKeyId && secretAccessKey && userBucket) {
      for (const post of posts) {
        if (post.image_url?.includes(userPublicUrl)) {
          const key = post.image_url.replace(userPublicUrl + '/', '');
          await deleteFromR2(key, userBucket, accountId, accessKeyId, secretAccessKey);
        }
      }
    }

    // Delete user data from tables (order matters for foreign keys)
    const tablesToDelete = [
      'appreciations',
      'comments',
      'messages',
      'posts',
      'friendships',
      'group_members',
      'group_invites',
      'group_join_requests',
      'group_posts',
      'group_post_comments',
      'group_poll_votes',
      'notifications',
      'profile_gallery',
      'profile_projects',
      'profile_sections',
      'pinned_audio',
      'events',
      'expenses',
      'invoices',
      'contracts',
      'other_income',
      'income_proof_shares',
      'course_enrollments',
      'email_logs',
      'email_templates',
      'availability_templates',
      'calendar_connections',
      'lesson_bookings',
      'lesson_conversations',
      'lesson_messages',
      'cart_abandonment',
      'tech_specs',
      'profiles',
      'user_roles',
    ];

    for (const table of tablesToDelete) {
      try {
        await adminClient.from(table).delete().eq('user_id', userId);
      } catch (e) {
        console.log(`Could not delete from ${table}:`, e);
      }
    }

    // Delete conversations where user is a participant
    await adminClient
      .from('conversations')
      .delete()
      .contains('participant_ids', [userId]);

    // Finally, delete the auth user
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error('Failed to delete auth user:', deleteUserError);
    }

    // Mark request as completed
    await adminClient
      .from('account_deletion_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', request.id);

    console.log(`Account deletion completed for user ${userId}`);

    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Deleted</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; display: flex; align-items: center; justify-content: center; min-height: 100vh;">
        <div style="max-width: 500px; background: white; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="font-size: 48px; margin-bottom: 20px;">✓</div>
          <h1 style="color: #333; margin: 0 0 16px;">Account Deleted</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Your World Music Method account has been permanently deleted. All your data and uploaded files have been removed.
          </p>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            We're sorry to see you go. Thank you for being part of our community.
          </p>
        </div>
      </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      '<html><body><h1>Error</h1><p>An unexpected error occurred. Please try again later.</p></body></html>',
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
});
