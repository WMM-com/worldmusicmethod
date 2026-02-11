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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Verify requesting user is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if user is admin
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Admin ${user.id} deleting user ${userId}`);

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
        console.log(`Deleted avatar: ${key}`);
      }
      if (profile.cover_image_url?.includes(userPublicUrl)) {
        const key = profile.cover_image_url.replace(userPublicUrl + '/', '');
        await deleteFromR2(key, userBucket, accountId, accessKeyId, secretAccessKey);
        console.log(`Deleted cover image: ${key}`);
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
      console.log(`Deleted ${gallery.length} gallery images`);
    }

    // 3. Messages with media
    const { data: messages } = await adminClient
      .from('messages')
      .select('metadata')
      .eq('sender_id', userId);

    if (messages && accountId && accessKeyId && secretAccessKey && userBucket) {
      for (const msg of messages) {
        const mediaUrl = (msg.metadata as any)?.mediaUrl;
        if (mediaUrl?.includes(userPublicUrl)) {
          const key = mediaUrl.replace(userPublicUrl + '/', '');
          await deleteFromR2(key, userBucket, accountId, accessKeyId, secretAccessKey);
        }
      }
      console.log(`Processed ${messages.length} messages for media deletion`);
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
      console.log(`Deleted media from ${posts.length} posts`);
    }

    // 5. Group posts with media
    const { data: groupPosts } = await adminClient
      .from('group_posts')
      .select('media_url')
      .eq('user_id', userId);

    if (groupPosts && accountId && accessKeyId && secretAccessKey && userBucket) {
      for (const post of groupPosts) {
        if (post.media_url?.includes(userPublicUrl)) {
          const key = post.media_url.replace(userPublicUrl + '/', '');
          await deleteFromR2(key, userBucket, accountId, accessKeyId, secretAccessKey);
        }
      }
      console.log(`Deleted media from ${groupPosts.length} group posts`);
    }

    // 6. Pinned audio
    const { data: pinnedAudio } = await adminClient
      .from('pinned_audio')
      .select('audio_url, cover_image_url')
      .eq('user_id', userId);

    if (pinnedAudio && accountId && accessKeyId && secretAccessKey && userBucket) {
      for (const audio of pinnedAudio) {
        if (audio.audio_url?.includes(userPublicUrl)) {
          const key = audio.audio_url.replace(userPublicUrl + '/', '');
          await deleteFromR2(key, userBucket, accountId, accessKeyId, secretAccessKey);
        }
        if (audio.cover_image_url?.includes(userPublicUrl)) {
          const key = audio.cover_image_url.replace(userPublicUrl + '/', '');
          await deleteFromR2(key, userBucket, accountId, accessKeyId, secretAccessKey);
        }
      }
      console.log(`Deleted ${pinnedAudio.length} pinned audio files`);
    }

    // 7. Media library items
    const { data: mediaItems } = await adminClient
      .from('media_library')
      .select('id, file_url, metadata')
      .eq('user_id', userId);

    if (mediaItems && accountId && accessKeyId && secretAccessKey && userBucket) {
      for (const item of mediaItems) {
        const objectKey = (item.metadata as { object_key?: string })?.object_key;
        if (objectKey) {
          const deleted = await deleteFromR2(objectKey, userBucket, accountId, accessKeyId, secretAccessKey);
          if (deleted) {
            console.log(`Deleted media library item: ${objectKey}`);
          }
        }
      }
      console.log(`Processed ${mediaItems.length} media library items for R2 deletion`);
    }

    // 8. Delete entire user folder from R2 (catch any remaining files)
    if (accountId && accessKeyId && secretAccessKey && userBucket) {
      try {
        // List and delete all objects with user's folder prefix
        const userFolderPrefix = `${userId}/`;
        console.log(`Cleaning up user folder: ${userFolderPrefix}`);
        
        let continuationToken: string | null = null;
        let totalDeleted = 0;
        
        do {
          const listParams = new URLSearchParams({
            'list-type': '2',
            'prefix': userFolderPrefix,
            'max-keys': '1000',
          });
          if (continuationToken) {
            listParams.set('continuation-token', continuationToken);
          }
          
          const listUrl = `https://${accountId}.r2.cloudflarestorage.com/${userBucket}?${listParams.toString()}`;
          const encoder = new TextEncoder();
          const now = new Date();
          const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
          const dateStamp = amzDate.slice(0, 8);
          
          // Sign the list request
          const listCanonicalUri = `/${userBucket}`;
          const listSignedHeaders = 'host;x-amz-content-sha256;x-amz-date';
          const listCanonicalHeaders = 
            `host:${accountId}.r2.cloudflarestorage.com\n` +
            `x-amz-content-sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n` +
            `x-amz-date:${amzDate}\n`;
          
          const listCanonicalRequest = [
            'GET', listCanonicalUri, listParams.toString(), listCanonicalHeaders, listSignedHeaders,
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
          ].join('\n');
          
          const listCredentialScope = `${dateStamp}/auto/s3/aws4_request`;
          const listRequestHash = await crypto.subtle.digest('SHA-256', encoder.encode(listCanonicalRequest));
          const listRequestHashHex = Array.from(new Uint8Array(listRequestHash)).map(b => b.toString(16).padStart(2, '0')).join('');
          const listStringToSign = ['AWS4-HMAC-SHA256', amzDate, listCredentialScope, listRequestHashHex].join('\n');
          
          const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
            const kDate = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', encoder.encode('AWS4' + key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(dateStamp));
            const kRegion = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kDate, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(regionName));
            const kService = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(serviceName));
            return await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode('aws4_request'));
          };
          
          const listSigningKey = await getSignatureKey(secretAccessKey, dateStamp, 'auto', 's3');
          const listSignature = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', listSigningKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(listStringToSign));
          const listSignatureHex = Array.from(new Uint8Array(listSignature)).map(b => b.toString(16).padStart(2, '0')).join('');
          
          const listResponse = await fetch(listUrl, {
            method: 'GET',
            headers: {
              'Host': `${accountId}.r2.cloudflarestorage.com`,
              'X-Amz-Date': amzDate,
              'X-Amz-Content-Sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${listCredentialScope}, SignedHeaders=${listSignedHeaders}, Signature=${listSignatureHex}`,
            },
          });
          
          if (listResponse.ok) {
            const listXml = await listResponse.text();
            const keyMatches = [...listXml.matchAll(/<Key>([^<]+)<\/Key>/g)];
            const keys = keyMatches.map(m => m[1]);
            
            for (const key of keys) {
              await deleteFromR2(key, userBucket, accountId, accessKeyId, secretAccessKey);
              totalDeleted++;
            }
            
            const truncatedMatch = listXml.match(/<IsTruncated>(\w+)<\/IsTruncated>/);
            const isTruncated = truncatedMatch?.[1] === 'true';
            const tokenMatch = listXml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
            continuationToken = isTruncated && tokenMatch ? tokenMatch[1] : null;
          } else {
            console.error('Failed to list user folder:', await listResponse.text());
            break;
          }
        } while (continuationToken);
        
        console.log(`Cleaned up ${totalDeleted} remaining files from user folder`);
      } catch (e) {
        console.error('Error cleaning up user folder:', e);
      }
    }

    // Delete user data from tables (order matters for foreign keys)
    const tablesToDelete = [
      'appreciations',
      'comments',
      'messages',
      'posts',
      'friendships',
      'user_blocks',
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
      'profile_pages',
      'extended_profiles',
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
      'account_deletion_requests',
      'media_library',
      'play_events',
      'credit_transactions',
      'user_credits',
      'referrals',
      'username_history',
      'user_tags',
      'digital_products',
      'digital_product_purchases',
      'artist_dashboard_access',
      'connected_account_subscriptions',
    ];

    // Delete booking-related data (has FK to profiles via student_id)
    // First delete child tables, then parent
    const { data: bookingRequests } = await adminClient
      .from('booking_requests')
      .select('id')
      .eq('student_id', userId);

    if (bookingRequests && bookingRequests.length > 0) {
      const requestIds = bookingRequests.map(r => r.id);
      await adminClient.from('booking_participants').delete().in('request_id', requestIds);
      await adminClient.from('booking_slots').delete().in('request_id', requestIds);
      await adminClient.from('booking_requests').delete().eq('student_id', userId);
    }

    // Now delete from the main tables list

    for (const table of tablesToDelete) {
      try {
        await adminClient.from(table).delete().eq('user_id', userId);
      } catch (e) {
        console.log(`Could not delete from ${table}:`, e);
      }
    }

    // Delete profiles and user_roles last (other tables have FK references to profiles)
    await adminClient.from('profiles').delete().eq('id', userId);
    await adminClient.from('user_roles').delete().eq('user_id', userId);

    // Delete conversations where user is a participant
    await adminClient
      .from('conversations')
      .delete()
      .contains('participant_ids', [userId]);

    // Finally, delete the auth user
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error('Failed to delete auth user:', deleteUserError);
      return new Response(JSON.stringify({ error: 'Failed to delete auth user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`User ${userId} deleted successfully by admin ${user.id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
