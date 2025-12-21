import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Course title patterns to exclude
const EXCLUDED_PATTERNS = [
  /^Platform Overview$/i,
  /Day \d+/i,
  /Final Day/i,
  /Part \d+$/i,
  /Sample Videos?/i,
];

// Check if a title should be excluded
function shouldExclude(title: string): boolean {
  return EXCLUDED_PATTERNS.some(pattern => pattern.test(title));
}

// Extract Soundslice ID from post content
function extractSoundsliceId(content: string): string | null {
  const patterns = [
    /\[drum url='https:\/\/www\.soundslice\.com\/slices\/([^']+)'\]/,
    /\[guitar url='https:\/\/www\.soundslice\.com\/slices\/([^']+)'\]/,
    /\[bass url='https:\/\/www\.soundslice\.com\/slices\/([^']+)'\]/,
    /soundslice\.com\/slices\/([a-zA-Z0-9]+)/,
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Extract YouTube ID from post content
function extractYoutubeId(content: string): string | null {
  const patterns = [
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Extract Spotify embed URL
function extractSpotifyEmbed(content: string): string | null {
  const match = content.match(/open\.spotify\.com\/embed\/[^"'\s]+/);
  return match ? `https://${match[0]}` : null;
}

// Clean HTML content to plain text
function cleanHtml(html: string): string {
  return html
    .replace(/<!-- wp:[^>]+-->/g, '')
    .replace(/<!-- \/wp:[^>]+-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n\n+/g, '\n\n')
    .trim();
}

// Extract image URLs from content
function extractImageUrls(content: string): string[] {
  const imgPattern = /src="(https:\/\/[^"]+\.(jpg|jpeg|png|gif|webp))"/gi;
  const urls: string[] = [];
  let match;
  while ((match = imgPattern.exec(content)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, coursePages, modules, lessons } = body;

    if (action === 'parse-courses') {
      // Parse course pages data
      const courses: any[] = [];
      const lines = (coursePages as string).split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const title = data.wp_post?.post_title;
          
          if (!title || shouldExclude(title)) {
            console.log(`Skipping: ${title}`);
            continue;
          }
          
          const content = data.wp_post?.post_content || '';
          const images = extractImageUrls(content);
          
          courses.push({
            wp_id: data.wp_post?.ID,
            title,
            description: cleanHtml(data.wp_post?.post_excerpt || ''),
            content: cleanHtml(content),
            permalink: data.wp_post_permalink,
            images,
            course_steps: data.wp_post_meta?.ld_course_steps?.[0]?.steps?.h?.['sfwd-lessons'] || {},
          });
        } catch (e) {
          console.error('Error parsing course line:', e);
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        courses,
        count: courses.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'parse-modules') {
      // Parse modules data
      const modulesData: any[] = [];
      const lines = (modules as string).split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const title = data.wp_post?.post_title;
          
          if (!title || shouldExclude(title)) {
            console.log(`Skipping module: ${title}`);
            continue;
          }
          
          const content = data.wp_post?.post_content || '';
          const courseId = data.wp_post_meta?.course_id?.[0];
          
          modulesData.push({
            wp_id: data.wp_post?.ID,
            title,
            description: cleanHtml(content),
            permalink: data.wp_post_permalink,
            wp_course_id: courseId,
            youtube_id: extractYoutubeId(content),
            spotify_embed: extractSpotifyEmbed(content),
          });
        } catch (e) {
          console.error('Error parsing module line:', e);
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        modules: modulesData,
        count: modulesData.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'parse-lessons') {
      // Parse lessons data
      const lessonsData: any[] = [];
      const lines = (lessons as string).split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const title = data.wp_post?.post_title;
          
          if (!title || shouldExclude(title)) {
            console.log(`Skipping lesson: ${title}`);
            continue;
          }
          
          const content = data.wp_post?.post_content || '';
          const courseId = data.wp_post_meta?.course_id?.[0];
          
          // Get module ID from the permalink (lesson is under a module in LearnDash)
          const permalink = data.wp_post_permalink || '';
          const moduleMatch = permalink.match(/\/lessons\/([^\/]+)\/topics\//);
          const moduleSlug = moduleMatch ? moduleMatch[1] : null;
          
          lessonsData.push({
            wp_id: data.wp_post?.ID,
            title,
            content: cleanHtml(content),
            permalink,
            wp_course_id: courseId,
            module_slug: moduleSlug,
            soundslice_id: extractSoundsliceId(content),
            youtube_id: extractYoutubeId(content),
            spotify_embed: extractSpotifyEmbed(content),
          });
        } catch (e) {
          console.error('Error parsing lesson line:', e);
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        lessons: lessonsData,
        count: lessonsData.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'import-to-db') {
      // Import parsed data to database
      const { courseTitle, parsedModules, parsedLessons } = body;
      
      // Find the course in our database by title
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .ilike('title', courseTitle)
        .single();
      
      if (courseError || !course) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Course not found: ${courseTitle}` 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const results = {
        modulesCreated: 0,
        lessonsCreated: 0,
        errors: [] as string[],
      };
      
      // Create modules
      for (let i = 0; i < parsedModules.length; i++) {
        const mod = parsedModules[i];
        
        const { data: existingModule } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', course.id)
          .eq('title', mod.title)
          .single();
        
        if (existingModule) {
          console.log(`Module already exists: ${mod.title}`);
          continue;
        }
        
        const { error } = await supabase
          .from('course_modules')
          .insert({
            course_id: course.id,
            title: mod.title,
            description: mod.description,
            order_index: i,
          });
        
        if (error) {
          results.errors.push(`Module: ${mod.title} - ${error.message}`);
        } else {
          results.modulesCreated++;
        }
      }
      
      // Create lessons (need to get module IDs first)
      const { data: dbModules } = await supabase
        .from('course_modules')
        .select('id, title')
        .eq('course_id', course.id);
      
      const moduleMap = new Map(dbModules?.map(m => [m.title.toLowerCase(), m.id]) || []);
      
      for (let i = 0; i < parsedLessons.length; i++) {
        const lesson = parsedLessons[i];
        
        // Try to find the module by matching the module slug to module titles
        let moduleId: string | null = null;
        for (const [title, id] of moduleMap.entries()) {
          const slugified = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          if (lesson.module_slug?.includes(slugified) || slugified.includes(lesson.module_slug || '')) {
            moduleId = id;
            break;
          }
        }
        
        if (!moduleId) {
          // Default to first module if can't match
          moduleId = dbModules?.[0]?.id;
        }
        
        if (!moduleId) {
          results.errors.push(`No module found for lesson: ${lesson.title}`);
          continue;
        }
        
        const { data: existingLesson } = await supabase
          .from('module_lessons')
          .select('id')
          .eq('module_id', moduleId)
          .eq('title', lesson.title)
          .single();
        
        if (existingLesson) {
          console.log(`Lesson already exists: ${lesson.title}`);
          continue;
        }
        
        // Determine video URL
        let videoUrl = null;
        if (lesson.soundslice_id) {
          videoUrl = `https://www.soundslice.com/slices/${lesson.soundslice_id}/`;
        } else if (lesson.youtube_id) {
          videoUrl = `https://www.youtube.com/embed/${lesson.youtube_id}`;
        }
        
        const { error } = await supabase
          .from('module_lessons')
          .insert({
            module_id: moduleId,
            title: lesson.title,
            content: lesson.content,
            video_url: videoUrl,
            lesson_type: lesson.soundslice_id ? 'video' : (lesson.youtube_id ? 'video' : 'reading'),
            order_index: i,
          });
        
        if (error) {
          results.errors.push(`Lesson: ${lesson.title} - ${error.message}`);
        } else {
          results.lessonsCreated++;
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        courseId: course.id,
        results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Unknown action. Use: parse-courses, parse-modules, parse-lessons, or import-to-db' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
