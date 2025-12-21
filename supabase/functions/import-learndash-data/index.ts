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
    // Match shortcode formats: [guitar url='...'], [drum url='...'], [bass url='...'], etc.
    /\[\w+\s+url=['"]https?:\/\/(?:www\.)?soundslice\.com\/slices\/([a-zA-Z0-9]+)\/?['"]\s*\]/i,
    // Match direct URLs
    /soundslice\.com\/slices\/([a-zA-Z0-9]+)/i,
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      console.log('Found Soundslice ID:', match[1], 'from pattern:', pattern);
      return match[1];
    }
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, courseTitle, modulesData, lessonsData } = body;

    console.log('Received action:', action);

    if (action === 'import-course') {
      // Find the course in our database by title
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .ilike('title', `%${courseTitle}%`)
        .single();
      
      if (courseError || !course) {
        console.log('Course lookup error:', courseError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Course not found: ${courseTitle}` 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('Found course:', course.title, 'ID:', course.id);
      
      const results = {
        modulesCreated: 0,
        lessonsCreated: 0,
        errors: [] as string[],
      };
      
      // Parse and filter modules from the JSONL data
      const parsedModules: any[] = [];
      const lines = modulesData.split('\n').filter((l: string) => l.trim());
      
      // Create course slug - handle hyphens properly (e.g. "Desert Guitar – Origins" -> "desert-guitar-origins")
      const courseSlug = courseTitle.toLowerCase()
        .replace(/–/g, '-')  // Replace en-dash with hyphen
        .replace(/—/g, '-')  // Replace em-dash with hyphen
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-'); // Collapse multiple hyphens
      console.log('Looking for modules with course slug:', courseSlug);
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const permalink = data.wp_post_permalink || '';
          
          // Only include modules that belong to this course (check permalink contains course slug)
          if (!permalink.toLowerCase().includes(courseSlug)) {
            continue;
          }
          
          const title = data.wp_post?.post_title;
          if (!title || shouldExclude(title)) {
            console.log(`Skipping module: ${title}`);
            continue;
          }
          
          const content = data.wp_post?.post_content || '';
          
          parsedModules.push({
            wp_id: data.wp_post?.ID,
            title,
            description: cleanHtml(content),
            permalink,
            youtube_id: extractYoutubeId(content),
          });
        } catch (e) {
          console.error('Error parsing module line:', e);
        }
      }
      
      console.log(`Found ${parsedModules.length} modules for this course`);
      
      // Reverse the modules array to get correct order (JSONL is typically newest-first)
      parsedModules.reverse();
      
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
          console.error('Module insert error:', error);
          results.errors.push(`Module: ${mod.title} - ${error.message}`);
        } else {
          results.modulesCreated++;
          console.log(`Created module: ${mod.title}`);
        }
      }
      
      // Get all created modules for this course
      const { data: dbModules } = await supabase
        .from('course_modules')
        .select('id, title')
        .eq('course_id', course.id)
        .order('order_index');
      
      console.log(`DB has ${dbModules?.length || 0} modules for this course`);
      
      // Parse and filter lessons from the JSONL data
      const lessonsLines = lessonsData.split('\n').filter((l: string) => l.trim());
      
      // Create a map of module permalinks to module IDs
      const modulePermalinkMap = new Map<string, string>();
      for (const mod of parsedModules) {
        // Extract the lesson slug from the module permalink
        const lessonMatch = mod.permalink.match(/\/lessons\/([^\/]+)/);
        if (lessonMatch) {
          const moduleRecord = dbModules?.find(m => m.title === mod.title);
          if (moduleRecord) {
            modulePermalinkMap.set(lessonMatch[1], moduleRecord.id);
          }
        }
      }
      
      console.log('Module permalink map:', Object.fromEntries(modulePermalinkMap));
      
      // Reverse lessons to get correct order (JSONL is typically newest-first)
      const reversedLessonsLines = lessonsLines.reverse();
      
      for (const line of reversedLessonsLines) {
        try {
          const data = JSON.parse(line);
          const permalink = data.wp_post_permalink || '';
          
          // Only include lessons that belong to this course (check permalink contains course slug)
          if (!permalink.toLowerCase().includes(courseSlug)) {
            continue;
          }
          
          const title = data.wp_post?.post_title;
          if (!title || shouldExclude(title)) {
            console.log(`Skipping lesson: ${title}`);
            continue;
          }
          
          const content = data.wp_post?.post_content || '';
          
          // Find which module this lesson belongs to from the permalink
          const lessonMatch = permalink.match(/\/lessons\/([^\/]+)\//);
          let moduleId: string | null = null;
          
          if (lessonMatch) {
            moduleId = modulePermalinkMap.get(lessonMatch[1]) || null;
          }
          
          // Fallback to first module if can't match
          if (!moduleId && dbModules?.length) {
            moduleId = dbModules[0].id;
          }
          
          if (!moduleId) {
            results.errors.push(`No module found for lesson: ${title}`);
            continue;
          }
          
          // Check if lesson exists
          const { data: existingLesson } = await supabase
            .from('module_lessons')
            .select('id')
            .eq('module_id', moduleId)
            .eq('title', title)
            .single();
          
          if (existingLesson) {
            console.log(`Lesson already exists: ${title}`);
            continue;
          }
          
          // Determine video URL
          let videoUrl = null;
          const soundsliceId = extractSoundsliceId(content);
          const youtubeId = extractYoutubeId(content);
          
          if (soundsliceId) {
            videoUrl = `https://www.soundslice.com/slices/${soundsliceId}/`;
          } else if (youtubeId) {
            videoUrl = `https://www.youtube.com/embed/${youtubeId}`;
          }
          
          // Get current count for order
          const { count } = await supabase
            .from('module_lessons')
            .select('*', { count: 'exact', head: true })
            .eq('module_id', moduleId);
          
          const { error } = await supabase
            .from('module_lessons')
            .insert({
              module_id: moduleId,
              title,
              content: cleanHtml(content),
              video_url: videoUrl,
              lesson_type: soundsliceId ? 'video' : (youtubeId ? 'video' : 'reading'),
              order_index: count || 0,
            });
          
          if (error) {
            console.error('Lesson insert error:', error);
            results.errors.push(`Lesson: ${title} - ${error.message}`);
          } else {
            results.lessonsCreated++;
            console.log(`Created lesson: ${title}`);
          }
        } catch (e) {
          console.error('Error parsing lesson line:', e);
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        courseId: course.id,
        courseTitle: course.title,
        results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Unknown action. Use: import-course' 
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
