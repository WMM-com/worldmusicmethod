import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decode HTML entities
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'");
}

// Extract YouTube video IDs from content
function extractYouTubeUrls(content: string): string[] {
  const urls: string[] = [];
  
  // Match iframe embeds
  const iframePattern = /src=["']https?:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/([a-zA-Z0-9_-]{11})[^"']*["']/gi;
  let iframeMatch: RegExpExecArray | null;
  while ((iframeMatch = iframePattern.exec(content)) !== null) {
    urls.push(`https://www.youtube.com/watch?v=${iframeMatch[1]}`);
  }
  
  // Match regular URLs
  const urlPattern = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlPattern.exec(content)) !== null) {
    const videoId = urlMatch[1];
    if (!urls.some(u => u.includes(videoId))) {
      urls.push(`https://www.youtube.com/watch?v=${videoId}`);
    }
  }
  
  return urls;
}

// Extract Spotify URLs from content
function extractSpotifyUrls(content: string): string[] {
  const urls: string[] = [];
  
  // Match iframe embeds
  const spotifyIframePattern = /src=["']https?:\/\/open\.spotify\.com\/embed\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)[^"']*["']/gi;
  let spotifyIframeMatch: RegExpExecArray | null;
  while ((spotifyIframeMatch = spotifyIframePattern.exec(content)) !== null) {
    urls.push(`https://open.spotify.com/${spotifyIframeMatch[1]}/${spotifyIframeMatch[2]}`);
  }
  
  // Match regular URLs
  const spotifyUrlPattern = /https?:\/\/open\.spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/gi;
  let spotifyUrlMatch: RegExpExecArray | null;
  while ((spotifyUrlMatch = spotifyUrlPattern.exec(content)) !== null) {
    const spotifyId = spotifyUrlMatch[2];
    if (!urls.some(u => u.includes(spotifyId))) {
      urls.push(`https://open.spotify.com/${spotifyUrlMatch[1]}/${spotifyId}`);
    }
  }
  
  return urls;
}

// Normalize title for matching
function normalizeTitle(title: string): string {
  return decodeEntities(title)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/module\s*\d+\s*[-–—:]\s*/gi, '')
    .replace(/\s*[-–—]\s*\d+\.\d+\s*$/g, '')
    .trim();
}

interface ParsedModuleContent {
  title: string;
  wpPostId: string;
  wpCourseId: string;
  rawContent: string;
  overview: string;
  learningFocus: string[];
  culturalContext: string;
  youtubeUrls: string[];
  spotifyUrls: string[];
}

// Parse section content from WordPress blocks
function extractSections(content: string): { overview: string; learningFocus: string[]; culturalContext: string } {
  let overview = '';
  let learningFocus: string[] = [];
  let culturalContext = '';
  
  // Clean up WP block comments
  let cleaned = content.replace(/<!-- \/?wp:[^>]+ -->/g, '');
  
  // Extract Overview section - typically first paragraph or after Overview heading
  const overviewMatch = cleaned.match(/<h4[^>]*>.*?Overview.*?<\/h4>\s*([\s\S]*?)(?=<h4|$)/i);
  if (overviewMatch) {
    const section = overviewMatch[1];
    const paragraphs = section.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (paragraphs) {
      overview = paragraphs.map(p => 
        decodeEntities(p.replace(/<\/?[^>]+(>|$)/g, '').trim())
      ).filter(p => p.length > 0).join('\n\n');
    }
  } else {
    // If no Overview heading, take first paragraph
    const firstP = cleaned.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (firstP) {
      overview = decodeEntities(firstP[1].replace(/<\/?[^>]+(>|$)/g, '').trim());
    }
  }
  
  // Extract Learning Focus / Learning Outcomes
  const learningMatch = cleaned.match(/<h4[^>]*>.*?(?:Learning Focus|Learning Outcomes|What You'll Learn).*?<\/h4>\s*([\s\S]*?)(?=<h4|$)/i);
  if (learningMatch) {
    const section = learningMatch[1];
    const listItems = section.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    if (listItems) {
      learningFocus = listItems.map(li => 
        decodeEntities(li.replace(/<\/?[^>]+(>|$)/g, '').trim())
      ).filter(item => item.length > 0);
    }
  }
  
  // Extract Cultural and Musical Context
  const culturalMatch = cleaned.match(/<h4[^>]*>.*?Cultural.*?Context.*?<\/h4>\s*([\s\S]*?)(?=<h4|$)/i);
  if (culturalMatch) {
    const section = culturalMatch[1];
    const paragraphs = section.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (paragraphs) {
      culturalContext = paragraphs.map(p => 
        decodeEntities(p.replace(/<\/?[^>]+(>|$)/g, '').trim())
      ).filter(p => p.length > 0).join('\n\n');
    }
  } else {
    // Check for inline format: <p><strong>Cultural and Musical Context</strong><br>...</p>
    const inlineMatch = cleaned.match(/<p[^>]*>\s*<strong>Cultural and Musical Context<\/strong>\s*(?:<br\s*\/?>)?\s*([\s\S]*?)<\/p>/i);
    if (inlineMatch) {
      culturalContext = decodeEntities(inlineMatch[1].replace(/<\/?[^>]+(>|$)/g, '').trim());
    }
  }
  
  return { overview, learningFocus, culturalContext };
}

// Parse WordPress XML for modules
function parseModulesFromXML(xmlContent: string): ParsedModuleContent[] {
  const modules: ParsedModuleContent[] = [];
  
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;
  
  while ((itemMatch = itemPattern.exec(xmlContent)) !== null) {
    const itemXml = itemMatch[1];
    
    const postTypeMatch = itemXml.match(/<wp:post_type><!\[CDATA\[([\s\S]*?)\]\]><\/wp:post_type>/);
    const postType = postTypeMatch ? postTypeMatch[1] : '';
    
    // Only process modules (sfwd-lessons in LearnDash)
    if (postType !== 'sfwd-lessons') continue;
    
    const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
    const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : '';
    
    // Skip preview modules
    if (title.toLowerCase().includes('preview')) continue;
    
    const postIdMatch = itemXml.match(/<wp:post_id>(\d+)<\/wp:post_id>/);
    const wpPostId = postIdMatch ? postIdMatch[1] : '';
    
    const contentMatch = itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    const rawContent = contentMatch ? contentMatch[1] : '';
    
    const courseIdMatch = itemXml.match(/<wp:meta_key><!\[CDATA\[course_id\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(\d+)\]\]><\/wp:meta_value>/);
    const wpCourseId = courseIdMatch ? courseIdMatch[1] : '';
    
    if (!title || !wpCourseId) continue;
    
    // Extract sections
    const { overview, learningFocus, culturalContext } = extractSections(rawContent);
    
    // Extract media
    const youtubeUrls = extractYouTubeUrls(rawContent);
    const spotifyUrls = extractSpotifyUrls(rawContent);
    
    modules.push({
      title,
      wpPostId,
      wpCourseId,
      rawContent,
      overview,
      learningFocus,
      culturalContext,
      youtubeUrls,
      spotifyUrls,
    });
  }
  
  return modules;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ success: false, error: 'Backend not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const xmlContent = body?.xmlContent as string;
    const dryRun = body?.dryRun !== false;

    if (!xmlContent) {
      return new Response(JSON.stringify({ success: false, error: 'XML content required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[migrate-module-content] Starting ${dryRun ? 'DRY RUN' : 'LIVE'} migration...`);

    // Parse modules from XML
    const wpModules = parseModulesFromXML(xmlContent);
    console.log(`[migrate-module-content] Parsed ${wpModules.length} modules from XML`);

    // Get WP courses
    const wpCourses: Record<string, string> = {};
    const coursePattern = /<item>([\s\S]*?)<\/item>/gi;
    let courseMatch;
    while ((courseMatch = coursePattern.exec(xmlContent)) !== null) {
      const itemXml = courseMatch[1];
      const postTypeMatch = itemXml.match(/<wp:post_type><!\[CDATA\[sfwd-courses\]\]><\/wp:post_type>/);
      if (!postTypeMatch) continue;
      
      const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
      const postIdMatch = itemXml.match(/<wp:post_id>(\d+)<\/wp:post_id>/);
      if (titleMatch && postIdMatch) {
        wpCourses[postIdMatch[1]] = decodeEntities(titleMatch[1].trim());
      }
    }

    // Load DB courses and modules
    const { data: dbCourses } = await supabase.from('courses').select('id, title');
    const { data: dbModules } = await supabase.from('course_modules').select('id, course_id, title, description');

    // Build WP course ID -> DB course ID mapping
    const wpToDbCourse = new Map<string, string>();
    for (const [wpId, wpTitle] of Object.entries(wpCourses)) {
      const normalizedWpTitle = normalizeTitle(wpTitle);
      const dbCourse = (dbCourses || []).find(c => {
        const dbNorm = normalizeTitle(c.title);
        return dbNorm === normalizedWpTitle || 
               dbNorm.includes(normalizedWpTitle) || 
               normalizedWpTitle.includes(dbNorm);
      });
      if (dbCourse) {
        wpToDbCourse.set(wpId, dbCourse.id);
      }
    }

    const results = {
      modulesMatched: 0,
      modulesUpdated: 0,
      modulesNotMatched: [] as string[],
      updates: [] as { title: string; hasOverview: boolean; learningCount: number; hasCultural: boolean; youtubeCount: number; spotifyCount: number }[],
      errors: [] as string[],
    };

    // Process each WP module
    for (const wpModule of wpModules) {
      const dbCourseId = wpToDbCourse.get(wpModule.wpCourseId);
      if (!dbCourseId) {
        results.modulesNotMatched.push(`${wpModule.title} (course not found)`);
        continue;
      }

      // Find matching DB module
      const normalizedWpTitle = normalizeTitle(wpModule.title);
      const dbModule = (dbModules || []).find(m => {
        if (m.course_id !== dbCourseId) return false;
        const dbNorm = normalizeTitle(m.title);
        return dbNorm === normalizedWpTitle || 
               dbNorm.includes(normalizedWpTitle) || 
               normalizedWpTitle.includes(dbNorm);
      });

      if (!dbModule) {
        results.modulesNotMatched.push(`${wpModule.title} (module not found in course)`);
        continue;
      }

      results.modulesMatched++;

      const updateData: Record<string, any> = {};
      
      // Only update if we have meaningful content
      if (wpModule.overview && wpModule.overview.length > 10) {
        updateData.description = wpModule.overview;
      }
      if (wpModule.learningFocus.length > 0) {
        updateData.learning_outcomes = wpModule.learningFocus;
      }
      if (wpModule.culturalContext && wpModule.culturalContext.length > 10) {
        updateData.cultural_context = wpModule.culturalContext;
      }
      if (wpModule.youtubeUrls.length > 0) {
        updateData.youtube_urls = wpModule.youtubeUrls;
      }
      if (wpModule.spotifyUrls.length > 0) {
        updateData.spotify_urls = wpModule.spotifyUrls;
      }

      results.updates.push({
        title: wpModule.title,
        hasOverview: !!updateData.description,
        learningCount: wpModule.learningFocus.length,
        hasCultural: !!updateData.cultural_context,
        youtubeCount: wpModule.youtubeUrls.length,
        spotifyCount: wpModule.spotifyUrls.length,
      });

      if (!dryRun && Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('course_modules')
          .update(updateData)
          .eq('id', dbModule.id);

        if (error) {
          results.errors.push(`Failed to update ${wpModule.title}: ${error.message}`);
        } else {
          results.modulesUpdated++;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[migrate-module-content] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
