import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MediaEmbed {
  type: 'youtube' | 'spotify' | 'vimeo';
  url: string;
  embedUrl: string;
}

interface ProcessedItem {
  title: string;
  postType: 'module' | 'lesson';
  courseId: string;
  wpPostId: string;
  embeds: MediaEmbed[];
  description?: string;
}

// Extract YouTube IDs and URLs from content
function extractYouTubeEmbeds(content: string): MediaEmbed[] {
  const embeds: MediaEmbed[] = [];
  
  // Match iframe embeds
  const iframePattern = /src=["']https?:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/([a-zA-Z0-9_-]+)[\?"]?[^"']*["']/gi;
  let match;
  while ((match = iframePattern.exec(content)) !== null) {
    const videoId = match[1];
    embeds.push({
      type: 'youtube',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`
    });
  }
  
  // Match regular YouTube URLs
  const urlPattern = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/gi;
  while ((match = urlPattern.exec(content)) !== null) {
    const videoId = match[1];
    const exists = embeds.some(e => e.url.includes(videoId));
    if (!exists) {
      embeds.push({
        type: 'youtube',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`
      });
    }
  }
  
  return embeds;
}

// Extract Spotify embeds from content
function extractSpotifyEmbeds(content: string): MediaEmbed[] {
  const embeds: MediaEmbed[] = [];
  
  // Match Spotify iframe embeds
  const iframePattern = /src=["']https?:\/\/open\.spotify\.com\/embed\/([a-z]+)\/([a-zA-Z0-9]+)[^"']*["']/gi;
  let match;
  while ((match = iframePattern.exec(content)) !== null) {
    const type = match[1];
    const id = match[2];
    embeds.push({
      type: 'spotify',
      url: `https://open.spotify.com/${type}/${id}`,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}`
    });
  }
  
  // Match regular Spotify URLs
  const urlPattern = /https?:\/\/open\.spotify\.com\/([a-z]+)\/([a-zA-Z0-9]+)/gi;
  while ((match = urlPattern.exec(content)) !== null) {
    const type = match[1];
    const id = match[2];
    if (type !== 'embed') {
      const exists = embeds.some(e => e.url.includes(id));
      if (!exists) {
        embeds.push({
          type: 'spotify',
          url: `https://open.spotify.com/${type}/${id}`,
          embedUrl: `https://open.spotify.com/embed/${type}/${id}`
        });
      }
    }
  }
  
  return embeds;
}

// Extract Vimeo embeds
function extractVimeoEmbeds(content: string): MediaEmbed[] {
  const embeds: MediaEmbed[] = [];
  
  const iframePattern = /src=["']https?:\/\/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)[^"']*["']/gi;
  let match;
  while ((match = iframePattern.exec(content)) !== null) {
    const videoId = match[1];
    embeds.push({
      type: 'vimeo',
      url: `https://vimeo.com/${videoId}`,
      embedUrl: `https://player.vimeo.com/video/${videoId}`
    });
  }
  
  return embeds;
}

// Fix module description formatting issues
function fixDescriptionFormatting(description: string): string {
  if (!description) return '';
  
  let fixed = description;
  
  // Fix "Cultural & Musical Context:" or "Cultural and Musical Context" stuck to previous text
  // Pattern: text without newline before "Cultural"
  fixed = fixed.replace(/([^\n])(Cultural\s*[&and]*\s*Musical\s*Context)/gi, '$1\n\n$2');
  
  // Ensure there's a line break after "Learning Focus:" or "Learning Focus" section title
  fixed = fixed.replace(/(Learning\s*Focus:?)\s*([A-Z])/gi, '$1\n\n$2');
  
  // Ensure bullet points that should be sections are properly separated
  // Pattern: "Ear Training" or similar section markers in bullet format
  fixed = fixed.replace(/([^\n])(\n?•\s*(?:Cultural|Ear Training|Context|Musical Background))/gi, '$1\n\n$2');
  
  // Clean up excessive whitespace while preserving intentional paragraph breaks
  fixed = fixed.replace(/\n{4,}/g, '\n\n\n');
  
  return fixed.trim();
}

// Parse WordPress XML to extract items
function parseWordPressXML(xmlContent: string): ProcessedItem[] {
  const items: ProcessedItem[] = [];
  
  // Match each item in the XML
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;
  
  while ((itemMatch = itemPattern.exec(xmlContent)) !== null) {
    const itemXml = itemMatch[1];
    
    // Extract title
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const title = titleMatch ? titleMatch[1] : '';
    
    // Extract post type
    const postTypeMatch = itemXml.match(/<wp:post_type><!\[CDATA\[(.*?)\]\]><\/wp:post_type>/);
    const postType = postTypeMatch ? postTypeMatch[1] : '';
    
    // Only process lessons (modules are lessons in LearnDash with "Module" in title)
    if (postType !== 'sfwd-lessons') continue;
    
    // Extract post ID
    const postIdMatch = itemXml.match(/<wp:post_id>(\d+)<\/wp:post_id>/);
    const wpPostId = postIdMatch ? postIdMatch[1] : '';
    
    // Extract course ID from meta
    const courseIdMatch = itemXml.match(/<wp:meta_key><!\[CDATA\[course_id\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(\d+)\]\]><\/wp:meta_value>/);
    const courseId = courseIdMatch ? courseIdMatch[1] : '';
    
    // Extract content
    const contentMatch = itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    const content = contentMatch ? contentMatch[1] : '';
    
    // Extract embeds from content
    const youtubeEmbeds = extractYouTubeEmbeds(content);
    const spotifyEmbeds = extractSpotifyEmbeds(content);
    const vimeoEmbeds = extractVimeoEmbeds(content);
    
    const allEmbeds = [...youtubeEmbeds, ...spotifyEmbeds, ...vimeoEmbeds];
    
    // Determine if this is a module or lesson
    const isModule = title.toLowerCase().includes('module');
    
    // Extract and fix description for modules
    let description = '';
    if (isModule && content) {
      // Strip HTML but preserve structure
      description = content
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '\n')
        .replace(/<h[1-6][^>]*>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      description = fixDescriptionFormatting(description);
    }
    
    if (title) {
      items.push({
        title,
        postType: isModule ? 'module' : 'lesson',
        courseId,
        wpPostId,
        embeds: allEmbeds,
        description: isModule ? description : undefined
      });
    }
  }
  
  return items;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, xmlContent, fixDescriptions } = await req.json();

    if (action === 'parse-xml') {
      if (!xmlContent) {
        return new Response(
          JSON.stringify({ success: false, error: 'XML content is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const items = parseWordPressXML(xmlContent);
      
      // Group by modules and lessons, with embeds
      const modulesWithEmbeds = items.filter(i => i.postType === 'module' && i.embeds.length > 0);
      const lessonsWithEmbeds = items.filter(i => i.postType === 'lesson' && i.embeds.length > 0);
      
      // Summary of all embeds found
      const allEmbeds = items.flatMap(i => i.embeds);
      const youtubeCount = allEmbeds.filter(e => e.type === 'youtube').length;
      const spotifyCount = allEmbeds.filter(e => e.type === 'spotify').length;
      const vimeoCount = allEmbeds.filter(e => e.type === 'vimeo').length;

      return new Response(
        JSON.stringify({
          success: true,
          summary: {
            totalItems: items.length,
            modulesWithEmbeds: modulesWithEmbeds.length,
            lessonsWithEmbeds: lessonsWithEmbeds.length,
            youtubeEmbeds: youtubeCount,
            spotifyEmbeds: spotifyCount,
            vimeoEmbeds: vimeoCount
          },
          items: items.slice(0, 100), // Limit response size
          modulesWithEmbeds,
          lessonsWithEmbeds
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'fix-descriptions') {
      // Fix all module descriptions in the database
      const { data: modules, error: fetchError } = await supabase
        .from('course_modules')
        .select('id, title, description');

      if (fetchError) {
        return new Response(
          JSON.stringify({ success: false, error: fetchError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updates: { id: string; title: string; originalDesc: string; fixedDesc: string }[] = [];

      for (const module of modules || []) {
        if (!module.description) continue;
        
        const fixed = fixDescriptionFormatting(module.description);
        
        if (fixed !== module.description) {
          // Update in database
          const { error: updateError } = await supabase
            .from('course_modules')
            .update({ description: fixed })
            .eq('id', module.id);

          if (!updateError) {
            updates.push({
              id: module.id,
              title: module.title,
              originalDesc: module.description.substring(0, 200),
              fixedDesc: fixed.substring(0, 200)
            });
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          modulesFixed: updates.length,
          updates
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update-embeds') {
      // Update lessons/modules with extracted embeds
      const { items: itemsToUpdate } = await req.json();
      
      if (!itemsToUpdate || !Array.isArray(itemsToUpdate)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Items array is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = {
        lessonsUpdated: 0,
        modulesUpdated: 0,
        errors: [] as string[]
      };

      for (const item of itemsToUpdate) {
        if (item.postType === 'lesson' && item.embeds.length > 0) {
          // Find the lesson by title and update video_url if empty
          const { data: lessons } = await supabase
            .from('module_lessons')
            .select('id, video_url, title')
            .ilike('title', `%${item.title.split('-')[0].trim()}%`);

          if (lessons && lessons.length > 0) {
            const lesson = lessons[0];
            if (!lesson.video_url && item.embeds[0]) {
              const { error } = await supabase
                .from('module_lessons')
                .update({ video_url: item.embeds[0].embedUrl })
                .eq('id', lesson.id);

              if (!error) {
                results.lessonsUpdated++;
              } else {
                results.errors.push(`Failed to update lesson ${item.title}: ${error.message}`);
              }
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Unknown action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing WordPress XML:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
