import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { parseAuthors, parsePosts } from './xml-parser.ts';
import {
  cleanContent,
  extractImageUrls,
  isWpHostedImage,
  wpUrlToR2,
  calculateReadingTime,
  generateExcerpt,
} from './html-cleaner.ts';
import { downloadAndUploadToR2 } from './r2-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FALLBACK_IMAGE = 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/04/cropped-Site-Favicon-32x32.png';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- Auth check (must be admin) ----
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData } = await anonClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ success: false, error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Parse request ----
    const body = await req.json();
    const xmlContent = body?.xmlContent as string | undefined;
    const action = (body?.action as string) || 'import';
    const dryRun = body?.dryRun === true;

    if (!xmlContent) {
      return new Response(JSON.stringify({ success: false, error: 'XML content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[import-wp-blogs] action=${action} dryRun=${dryRun} xmlSize=${xmlContent.length}`);

    // ---- Parse XML ----
    const authors = parseAuthors(xmlContent);
    const posts = parsePosts(xmlContent);

    console.log(`[import-wp-blogs] Found ${posts.length} published posts, ${authors.size} authors`);

    // ---- Preview mode ----
    if (action === 'preview') {
      return new Response(
        JSON.stringify({
          success: true,
          postsFound: posts.length,
          posts: posts.map((p) => ({
            title: p.title,
            slug: p.slug,
            author: authors.get(p.authorLogin)?.displayName || p.authorLogin,
            categories: p.categories,
            publishedAt: p.publishedAt,
            hasContent: p.content.length > 0,
            contentLength: p.content.length,
            imageCount: extractImageUrls(p.content).length,
          })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ---- Full import ----
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const results = {
      total: posts.length,
      imported: 0,
      skipped: 0,
      imagesMigrated: 0,
      errors: [] as string[],
      slugs: [] as string[],
    };

    for (const post of posts) {
      try {
        // 1. Process images in content
        const contentImages = extractImageUrls(post.content);
        const imageUrlMap = new Map<string, string>();

        for (const imgUrl of contentImages) {
          if (imgUrl.includes('r2.dev')) {
            // Already on R2 – keep as-is
            continue;
          }

          if (isWpHostedImage(imgUrl)) {
            // Convert WP URL to R2 path
            const r2Equivalent = wpUrlToR2(imgUrl);
            if (r2Equivalent !== imgUrl) {
              imageUrlMap.set(imgUrl, r2Equivalent);
              continue;
            }

            // If no R2 equivalent exists, download & upload
            if (!dryRun) {
              const ext = imgUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)?.[1] || 'jpg';
              const r2Key = `blog-images/${post.slug}/${crypto.randomUUID().slice(0, 8)}.${ext}`;
              const newUrl = await downloadAndUploadToR2(imgUrl, r2Key);
              if (newUrl) {
                imageUrlMap.set(imgUrl, newUrl);
                results.imagesMigrated++;
              }
            }
          }
        }

        // 2. Clean HTML content
        const cleanedContent = cleanContent(post.content, imageUrlMap);

        // 3. Determine featured image
        // Try first image from content (after URL mapping)
        const cleanedImages = extractImageUrls(cleanedContent);
        let featuredImage = cleanedImages[0] || FALLBACK_IMAGE;

        // If featured image is NOT on R2, try to download & upload
        if (!dryRun && featuredImage && !featuredImage.includes('r2.dev') && isWpHostedImage(featuredImage)) {
          const ext = featuredImage.match(/\.(jpg|jpeg|png|gif|webp)/i)?.[1] || 'jpg';
          const r2Key = `blog-images/${post.slug}/featured.${ext}`;
          const newUrl = await downloadAndUploadToR2(featuredImage, r2Key);
          if (newUrl) {
            featuredImage = newUrl;
            results.imagesMigrated++;
          }
        }

        // 4. Calculate metadata
        const readingTime = calculateReadingTime(cleanedContent);
        const authorName = authors.get(post.authorLogin)?.displayName || post.authorLogin;
        const excerpt = post.excerpt || generateExcerpt(cleanedContent);
        const metaDescription = post.metaDescription || generateExcerpt(cleanedContent, 155);

        // 5. Build the record
        const record = {
          slug: post.slug,
          title: post.title,
          content: cleanedContent,
          excerpt,
          featured_image: featuredImage,
          author_name: authorName,
          published_at: post.publishedAt ? new Date(post.publishedAt + 'Z').toISOString() : null,
          categories: post.categories,
          reading_time: readingTime,
          meta_title: post.title.length > 60 ? post.title.substring(0, 57) + '...' : post.title,
          meta_description: metaDescription,
        };

        if (dryRun) {
          results.slugs.push(post.slug);
          results.imported++;
          continue;
        }

        // 6. Upsert into blog_posts
        const { error: upsertErr } = await serviceClient
          .from('blog_posts')
          .upsert(record, { onConflict: 'slug' });

        if (upsertErr) {
          console.error(`[import-wp-blogs] Upsert error for ${post.slug}:`, upsertErr.message);
          results.errors.push(`${post.slug}: ${upsertErr.message}`);
          results.skipped++;
        } else {
          results.slugs.push(post.slug);
          results.imported++;
        }
      } catch (postErr) {
        const msg = postErr instanceof Error ? postErr.message : String(postErr);
        console.error(`[import-wp-blogs] Error processing ${post.slug}:`, msg);
        results.errors.push(`${post.slug}: ${msg}`);
        results.skipped++;
      }
    }

    console.log(
      `[import-wp-blogs] Done: imported=${results.imported}, skipped=${results.skipped}, images=${results.imagesMigrated}`,
    );

    return new Response(
      JSON.stringify({ success: true, dryRun, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[import-wp-blogs] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
