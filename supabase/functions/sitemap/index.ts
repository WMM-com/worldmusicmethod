import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSitemapXml(urls: SitemapUrl[]): string {
  const urlElements = urls.map(url => {
    let urlElement = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`;
    
    if (url.lastmod) {
      urlElement += `\n    <lastmod>${url.lastmod}</lastmod>`;
    }
    if (url.changefreq) {
      urlElement += `\n    <changefreq>${url.changefreq}</changefreq>`;
    }
    if (url.priority !== undefined) {
      urlElement += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
    }
    
    urlElement += '\n  </url>';
    return urlElement;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Site hostname - using the published URL
    const hostname = 'https://worldmusicmethod.lovable.app';
    
    const urls: SitemapUrl[] = [];
    const now = new Date().toISOString().split('T')[0];

    // Static routes
    const staticRoutes = [
      { path: '/', priority: 1.0 },
      { path: '/courses', priority: 0.9 },
      { path: '/listen', priority: 0.8 },
      { path: '/membership', priority: 0.8 },
      { path: '/auth', priority: 0.3 },
    ];

    for (const route of staticRoutes) {
      urls.push({
        loc: `${hostname}${route.path}`,
        lastmod: now,
        changefreq: 'weekly',
        priority: route.priority,
      });
    }

    // Fetch published courses
    console.log('Fetching published courses...');
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('slug, updated_at')
      .eq('is_published', true)
      .not('slug', 'is', null);

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
    } else if (courses) {
      console.log(`Found ${courses.length} published courses`);
      for (const course of courses) {
        if (course.slug) {
          urls.push({
            loc: `${hostname}/course/${course.slug}`,
            lastmod: course.updated_at?.split('T')[0] || now,
            changefreq: 'weekly',
            priority: 0.8,
          });
        }
      }
    }

    // Fetch artists
    console.log('Fetching artists...');
    const { data: artists, error: artistsError } = await supabase
      .from('media_artists')
      .select('slug, updated_at')
      .not('slug', 'is', null);

    if (artistsError) {
      console.error('Error fetching artists:', artistsError);
    } else if (artists) {
      console.log(`Found ${artists.length} artists`);
      for (const artist of artists) {
        if (artist.slug) {
          urls.push({
            loc: `${hostname}/artist/${artist.slug}`,
            lastmod: artist.updated_at?.split('T')[0] || now,
            changefreq: 'weekly',
            priority: 0.7,
          });
        }
      }
    }

    // Generate the sitemap XML
    const sitemapXml = buildSitemapXml(urls);
    
    console.log(`Generated sitemap with ${urls.length} URLs`);

    return new Response(sitemapXml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Sitemap generation error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to generate sitemap' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
