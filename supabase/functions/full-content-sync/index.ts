import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedModule {
  title: string;
  wpPostId: string;
  wpCourseId: string;
  content: string;
  formattedDescription: string;
  youtubeUrls: string[];
  spotifyUrls: string[];
  order: number;
}

interface ParsedLesson {
  title: string;
  wpPostId: string;
  wpLessonId: string; // parent module WP ID
  wpCourseId: string;
  content: string;
  videoUrl: string | null;
  soundsliceUrl: string | null;
  formattedContent: string;
  order: number;
}

// Decode HTML entities
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '\"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8220;/g, '\"')
    .replace(/&#8221;/g, '\"')
    .replace(/&nbsp;/g, ' ');
}

// Convert WordPress block content to clean markdown-like text
function formatContent(rawContent: string): string {
  let content = decodeEntities(rawContent);
  
  // Remove WordPress block comments
  content = content.replace(/<!-- \/?wp:[^>]+ -->/g, '');
  
  // Convert <strong> and <b> to **
  content = content.replace(/<strong>([^<]*)<\/strong>/gi, '**$1**');
  content = content.replace(/<b>([^<]*)<\/b>/gi, '**$1**');
  
  // Convert <em> and <i> to *
  content = content.replace(/<em>([^<]*)<\/em>/gi, '*$1*');
  content = content.replace(/<i>([^<]*)<\/i>/gi, '*$1*');
  
  // Convert links
  content = content.replace(/<a[^>]*href=\"([^\"]*)\"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)');
  
  // Convert list items - add bullet points
  content = content.replace(/<li>([^<]*)<\/li>/gi, '• $1');
  
  // Remove remaining HTML tags (ul, p, div, etc.) but keep content
  content = content.replace(/<\/?(ul|ol|p|div|span|br\s*\/?)[^>]*>/gi, '\n');
  
  // Remove iframe tags but extract info
  content = content.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  
  // Clean up multiple newlines
  content = content.replace(/\n{3,}/g, '\n\n');
  
  // Trim each line
  content = content.split('\n').map(line => line.trim()).join('\n');
  
  // Final cleanup
  content = content.trim();
  
  return content;
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

// Extract Soundslice URLs
function extractSoundsliceUrl(content: string): string | null {
  const patterns = [
    /\\[drum url=['"]([^'"]+)['"]\\]/i,
    /\\[vocals url\s*=\s*['"]([^'"]+)['"]\\]/i,
    /\\[bass url=['"]([^'"]+)['"]\\]/i,
    /\\[guitar url=['"]([^'"]+)['"]\\]/i,
    /https?:\/\/www\.soundslice\.com\/slices\/[a-zA-Z0-9]+/i,
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  
  return null;
}

// Extract R2/DynTube video URLs for self-hosted videos
function extractHostedVideoUrl(content: string): string | null {
  // DynTube pattern
  const dyntubePattern = /data-dyntube-key=\"([^\"]+)\"/i;
  const dynMatch = content.match(dyntubePattern);
  if (dynMatch) {
    return `dyntube:${dynMatch[1]}`;
  }
  
  // R2 URL pattern
  const r2Pattern = /https?:\/\/pub-[a-z0-9]+\.r2\.dev\/[^\s<>]+\.(mp4|webm|mov)/gi;
  const r2Match = content.match(r2Pattern);
  if (r2Match) {
    return r2Match[0];
  }
  
  return null;
}

// Normalize title for matching
function normalizeTitle(title: string): string {
  return decodeEntities(title)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[–—-]\s*\d+\.\d+\s*$/g, '') // Remove timecodes like "- 3.05"
    .trim();
}

// Parse WordPress XML and extract all content
function parseWordPressXML(xmlContent: string): {
  modules: ParsedModule[];
  lessons: ParsedLesson[];
  wpCourses: Record<string, string>;
} {
  const modules: ParsedModule[] = [];
  const lessons: ParsedLesson[] = [];
  const wpCourses: Record<string, string> = {}; // wpId -> title
  
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;
  let moduleOrder = 0;
  let lessonOrder = 0;
  
  while ((itemMatch = itemPattern.exec(xmlContent)) !== null) {
    const itemXml = itemMatch[1];
    
    // Extract basic fields
    const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
    const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : '';
    
    const postTypeMatch = itemXml.match(/<wp:post_type><!\[CDATA\[([\s\S]*?)\]\]><\/wp:post_type>/);
    const postType = postTypeMatch ? postTypeMatch[1] : '';
    
    const postIdMatch = itemXml.match(/<wp:post_id>(\d+)<\/wp:post_id>/);
    const wpPostId = postIdMatch ? postIdMatch[1] : '';
    
    const contentMatch = itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    const content = contentMatch ? contentMatch[1] : '';
    
    const courseIdMatch = itemXml.match(/<wp:meta_key><!\[CDATA\[course_id\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(\d+)\]\]><\/wp:meta_value>/);
    const wpCourseId = courseIdMatch ? courseIdMatch[1] : '';
    
    // Extract lesson_id for topics (lessons within modules)
    const lessonIdMatch = itemXml.match(/<wp:meta_key><!\[CDATA\[lesson_id\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(\d+)\]\]><\/wp:meta_value>/);
    const wpLessonId = lessonIdMatch ? lessonIdMatch[1] : '';
    
    // Capture courses for mapping
    if (postType === 'sfwd-courses' && wpPostId && title) {
      wpCourses[wpPostId] = title;
      continue;
    }
    
    // Module (sfwd-lessons in LearnDash terminology)
    if (postType === 'sfwd-lessons' && title && wpCourseId) {
      const formattedDescription = formatContent(content);
      const youtubeUrls = extractYouTubeUrls(content);
      const spotifyUrls = extractSpotifyUrls(content);
      
      modules.push({
        title,
        wpPostId,
        wpCourseId,
        content,
        formattedDescription,
        youtubeUrls,
        spotifyUrls,
        order: moduleOrder++,
      });
      continue;
    }
    
    // Lesson (sfwd-topic in LearnDash terminology)
    if (postType === 'sfwd-topic' && title && wpCourseId) {
      const formattedContent = formatContent(content);
      const soundsliceUrl = extractSoundsliceUrl(content);
      const hostedVideo = extractHostedVideoUrl(content);
      const youtubeUrls = extractYouTubeUrls(content);
      
      // Prioritize: Soundslice > Hosted Video > YouTube
      let videoUrl = soundsliceUrl || hostedVideo || (youtubeUrls.length > 0 ? youtubeUrls[0] : null);
      
      lessons.push({
        title,
        wpPostId,
        wpLessonId: wpLessonId || '',
        wpCourseId,
        content,
        videoUrl,
        soundsliceUrl,
        formattedContent,
        order: lessonOrder++,
      });
    }
  }
  
  return { modules, lessons, wpCourses };
}

// Main handler
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
    const action = body?.action as string;

    // AUDIT: List all modules with zero lessons and courses info
    if (action === 'audit') {
      const { data: courses } = await supabase.from('courses').select('id, title');
      const { data: modules } = await supabase.from('course_modules').select('id, course_id, title, description, order_index');
      const { data: lessons } = await supabase.from('module_lessons').select('id, module_id, title');
      
      const lessonCountByModule = new Map<string, number>();
      for (const l of lessons || []) {
        lessonCountByModule.set(l.module_id, (lessonCountByModule.get(l.module_id) || 0) + 1);
      }
      
      const emptyModules = (modules || [])
        .filter(m => !lessonCountByModule.has(m.id) || lessonCountByModule.get(m.id) === 0)
        .map(m => {
          const course = (courses || []).find(c => c.id === m.course_id);
          return {
            moduleId: m.id,
            moduleTitle: m.title,
            courseTitle: course?.title || 'Unknown',
            hasDescription: !!m.description && m.description.length > 50,
            orderIndex: m.order_index,
          };
        });
      
      const courseStats = (courses || []).map(c => {
        const courseModules = (modules || []).filter(m => m.course_id === c.id);
        const totalLessons = courseModules.reduce((sum, m) => sum + (lessonCountByModule.get(m.id) || 0), 0);
        const emptyModuleCount = courseModules.filter(m => !lessonCountByModule.has(m.id)).length;
        return {
          courseTitle: c.title,
          moduleCount: courseModules.length,
          lessonCount: totalLessons,
          emptyModules: emptyModuleCount,
        };
      }).sort((a, b) => b.emptyModules - a.emptyModules);
      
      return new Response(JSON.stringify({
        success: true,
        totalEmptyModules: emptyModules.length,
        emptyModules,
        courseStats,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PARSE: Parse XML and return summary
    if (action === 'parse-xml') {
      const xmlContent = body?.xmlContent as string;
      if (!xmlContent) {
        return new Response(JSON.stringify({ success: false, error: 'XML content required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const { modules, lessons, wpCourses } = parseWordPressXML(xmlContent);
      
      // Group by course
      const courseModules = new Map<string, ParsedModule[]>();
      for (const m of modules) {
        const courseName = wpCourses[m.wpCourseId] || `WP Course ${m.wpCourseId}`;
        if (!courseModules.has(courseName)) courseModules.set(courseName, []);
        courseModules.get(courseName)!.push(m);
      }
      
      const courseLessons = new Map<string, ParsedLesson[]>();
      for (const l of lessons) {
        const courseName = wpCourses[l.wpCourseId] || `WP Course ${l.wpCourseId}`;
        if (!courseLessons.has(courseName)) courseLessons.set(courseName, []);
        courseLessons.get(courseName)!.push(l);
      }
      
      const summary = Array.from(courseModules.entries()).map(([courseName, mods]) => ({
        course: courseName,
        moduleCount: mods.length,
        lessonCount: courseLessons.get(courseName)?.length || 0,
        modules: mods.slice(0, 5).map(m => ({
          title: m.title,
          hasContent: m.formattedDescription.length > 50,
          youtubeCount: m.youtubeUrls.length,
          spotifyCount: m.spotifyUrls.length,
        })),
      }));
      
      return new Response(JSON.stringify({
        success: true,
        totalModules: modules.length,
        totalLessons: lessons.length,
        totalCourses: Object.keys(wpCourses).length,
        summary,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SYNC: Full content sync from XML
    if (action === 'sync-content') {
      const xmlContent = body?.xmlContent as string;
      const dryRun = body?.dryRun !== false; // Default to dry run
      
      if (!xmlContent) {
        return new Response(JSON.stringify({ success: false, error: 'XML content required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('[full-content-sync] Parsing XML...');
      const { modules: wpModules, lessons: wpLessons, wpCourses } = parseWordPressXML(xmlContent);
      
      // Load DB data
      const [{ data: dbCourses }, { data: dbModules }, { data: dbLessons }] = await Promise.all([
        supabase.from('courses').select('id, title'),
        supabase.from('course_modules').select('id, course_id, title, description, order_index'),
        supabase.from('module_lessons').select('id, module_id, title, content, video_url'),
      ]);
      
      // Build course mapping: WP course ID -> DB course ID
      const wpToDbCourse = new Map<string, string>();
      for (const [wpId, wpTitle] of Object.entries(wpCourses)) {
        const normalizedWpTitle = normalizeTitle(wpTitle);
        const dbCourse = (dbCourses || []).find(c => {
          const dbNorm = normalizeTitle(c.title);
          return dbNorm === normalizedWpTitle || dbNorm.includes(normalizedWpTitle) || normalizedWpTitle.includes(dbNorm);
        });
        if (dbCourse) wpToDbCourse.set(wpId, dbCourse.id);
      }
      
      // Build module mapping: (course_id, normalized_title) -> module
      const moduleByKey = new Map<string, { id: string; description: string | null }>();
      for (const m of dbModules || []) {
        const key = `${m.course_id}|${normalizeTitle(m.title)}`;
        moduleByKey.set(key, { id: m.id, description: m.description });
      }
      
      // Build WP module ID -> DB module ID mapping
      const wpModuleToDbModule = new Map<string, string>();
      
      const moduleUpdates: Array<{ id: string; description: string }> = [];
      const modulesNotFound: string[] = [];
      
      for (const wpModule of wpModules) {
        const dbCourseId = wpToDbCourse.get(wpModule.wpCourseId);
        if (!dbCourseId) continue;
        
        const key = `${dbCourseId}|${normalizeTitle(wpModule.title)}`;
        const dbModule = moduleByKey.get(key);
        
        if (!dbModule) {
          modulesNotFound.push(`${wpCourses[wpModule.wpCourseId]} > ${wpModule.title}`);
          continue;
        }
        
        wpModuleToDbModule.set(wpModule.wpPostId, dbModule.id);
        
        // Update description if we have content and existing is empty/short
        if (wpModule.formattedDescription.length > 50) {
          const existingLen = dbModule.description?.length || 0;
          if (existingLen < 100) {
            // Build full description with embeds
            let fullDesc = wpModule.formattedDescription;
            if (wpModule.youtubeUrls.length > 0) {
              fullDesc += '\n\n' + wpModule.youtubeUrls.join('\n');
            }
            if (wpModule.spotifyUrls.length > 0) {
              fullDesc += '\n\n' + wpModule.spotifyUrls.join('\n');
            }
            
            moduleUpdates.push({ id: dbModule.id, description: fullDesc });
          }
        }
      }
      
      // Build lesson mapping and find missing
      const lessonByKey = new Map<string, { id: string; content: string | null; video_url: string | null }>();
      const moduleCourseId = new Map<string, string>();
      for (const m of dbModules || []) moduleCourseId.set(m.id, m.course_id);
      
      for (const l of dbLessons || []) {
        const courseId = moduleCourseId.get(l.module_id);
        if (!courseId) continue;
        const key = `${courseId}|${normalizeTitle(l.title)}`;
        lessonByKey.set(key, { id: l.id, content: l.content, video_url: l.video_url });
      }
      
      const lessonUpdates: Array<{ id: string; content?: string; video_url?: string }> = [];
      const lessonsNotFound: string[] = [];
      
      for (const wpLesson of wpLessons) {
        const dbCourseId = wpToDbCourse.get(wpLesson.wpCourseId);
        if (!dbCourseId) continue;
        
        const key = `${dbCourseId}|${normalizeTitle(wpLesson.title)}`;
        const dbLesson = lessonByKey.get(key);
        
        if (!dbLesson) {
          lessonsNotFound.push(`${wpCourses[wpLesson.wpCourseId]} > ${wpLesson.title}`);
          continue;
        }
        
        const update: { id: string; content?: string; video_url?: string } = { id: dbLesson.id };
        let needsUpdate = false;
        
        // Update video_url if empty and we have one
        if (!dbLesson.video_url && wpLesson.videoUrl) {
          update.video_url = wpLesson.videoUrl;
          needsUpdate = true;
        }
        
        // Update content if short and we have content
        if (wpLesson.formattedContent.length > 20 && (!dbLesson.content || dbLesson.content.length < 50)) {
          update.content = wpLesson.formattedContent;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          lessonUpdates.push(update);
        }
      }
      
      const results = {
        dryRun,
        wpModulesFound: wpModules.length,
        wpLessonsFound: wpLessons.length,
        coursesMapped: wpToDbCourse.size,
        moduleUpdatesQueued: moduleUpdates.length,
        lessonUpdatesQueued: lessonUpdates.length,
        modulesNotFound: modulesNotFound.slice(0, 30),
        lessonsNotFound: lessonsNotFound.slice(0, 30),
        sampleModuleUpdates: moduleUpdates.slice(0, 3).map(m => ({ id: m.id, descLen: m.description.length })),
      };
      
      if (!dryRun) {
        console.log(`[full-content-sync] Applying ${moduleUpdates.length} module updates...`);
        if (moduleUpdates.length > 0) {
          const { error } = await supabase.from('course_modules').upsert(moduleUpdates, { onConflict: 'id' });
          if (error) throw new Error(`Module update error: ${error.message}`);
        }
        
        console.log(`[full-content-sync] Applying ${lessonUpdates.length} lesson updates...`);
        if (lessonUpdates.length > 0) {
          const { error } = await supabase.from('module_lessons').upsert(lessonUpdates, { onConflict: 'id' });
          if (error) throw new Error(`Lesson update error: ${error.message}`);
        }
      }
      
      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action. Use: audit, parse-xml, sync-content' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
