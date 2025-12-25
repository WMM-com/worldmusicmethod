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
  listeningReferences: { title: string; artist: string; spotifyUrl?: string; youtubeUrl?: string }[];
  order: number;
}

interface ParsedLesson {
  title: string;
  wpPostId: string;
  wpLessonId: string;
  wpCourseId: string;
  content: string;
  videoUrl: string | null;
  soundsliceUrl: string | null;
  formattedContent: string;
  lessonType: string;
  listeningReferences: { title: string; artist: string; spotifyUrl?: string; youtubeUrl?: string }[];
  order: number;
}

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

// Convert WordPress block content to clean formatted text
function formatContent(rawContent: string): string {
  let content = decodeEntities(rawContent);
  
  // Remove WordPress block comments
  content = content.replace(/<!-- \/?wp:[^>]+ -->/g, '');
  
  // Extract and preserve headings
  content = content.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n\n## $1\n');
  content = content.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n');
  content = content.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n### $1\n');
  
  // Convert <strong> and <b>
  content = content.replace(/<strong>([^<]*)<\/strong>/gi, '**$1**');
  content = content.replace(/<b>([^<]*)<\/b>/gi, '**$1**');
  
  // Convert <em> and <i>
  content = content.replace(/<em>([^<]*)<\/em>/gi, '*$1*');
  content = content.replace(/<i>([^<]*)<\/i>/gi, '*$1*');
  
  // Convert links
  content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)');
  
  // Convert list items - add bullet points
  content = content.replace(/<li[^>]*>([^<]*)<\/li>/gi, '\n• $1');
  
  // Paragraphs to double newlines
  content = content.replace(/<\/p>/gi, '\n\n');
  content = content.replace(/<p[^>]*>/gi, '');
  
  // Remove remaining HTML tags but keep content
  content = content.replace(/<\/?(ul|ol|div|span|br\s*\/?|figure|figcaption)[^>]*>/gi, '\n');
  
  // Remove iframe and script tags entirely
  content = content.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Clean up multiple newlines
  content = content.replace(/\n{3,}/g, '\n\n');
  
  // Trim each line
  content = content.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
  
  return content.trim();
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
    /\[drum url\s*=\s*['"]([^'"]+)['"]\s*\]/i,
    /\[vocals url\s*=\s*['"]([^'"]+)['"]\s*\]/i,
    /\[bass url\s*=\s*['"]([^'"]+)['"]\s*\]/i,
    /\[guitar url\s*=\s*['"]([^'"]+)['"]\s*\]/i,
    /\[piano url\s*=\s*['"]([^'"]+)['"]\s*\]/i,
    /\[kora url\s*=\s*['"]([^'"]+)['"]\s*\]/i,
    /\[banjo url\s*=\s*['"]([^'"]+)['"]\s*\]/i,
    /(https?:\/\/www\.soundslice\.com\/slices\/[a-zA-Z0-9]+)/i,
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
  const dyntubePattern = /data-dyntube-key="([^"]+)"/i;
  const dynMatch = content.match(dyntubePattern);
  if (dynMatch) {
    return `dyntube:${dynMatch[1]}`;
  }
  
  // R2 URL pattern
  const r2Pattern = /https?:\/\/pub-[a-z0-9]+\.r2\.dev\/[^\s<>"']+\.(mp4|webm|mov)/gi;
  const r2Match = content.match(r2Pattern);
  if (r2Match) {
    return r2Match[0];
  }
  
  return null;
}

// Determine lesson type based on content
function determineLessonType(content: string): string {
  if (extractSoundsliceUrl(content)) return 'soundslice';
  if (extractYouTubeUrls(content).length > 0) return 'video';
  if (extractHostedVideoUrl(content)) return 'video';
  if (content.toLowerCase().includes('backing track')) return 'backing_track';
  if (content.toLowerCase().includes('download')) return 'download';
  return 'text';
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

// Parse WordPress XML and extract all content
function parseWordPressXML(xmlContent: string): {
  modules: ParsedModule[];
  lessons: ParsedLesson[];
  wpCourses: Record<string, string>;
  wpLessonToModuleMap: Map<string, string>;
} {
  const modules: ParsedModule[] = [];
  const lessons: ParsedLesson[] = [];
  const wpCourses: Record<string, string> = {};
  const wpLessonToModuleMap = new Map<string, string>();
  
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;
  
  // First pass: collect courses and modules
  const modulesByCourse = new Map<string, ParsedModule[]>();
  const lessonsByModule = new Map<string, ParsedLesson[]>();
  
  while ((itemMatch = itemPattern.exec(xmlContent)) !== null) {
    const itemXml = itemMatch[1];
    
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
    
    const lessonIdMatch = itemXml.match(/<wp:meta_key><!\[CDATA\[lesson_id\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(\d+)\]\]><\/wp:meta_value>/);
    const wpLessonId = lessonIdMatch ? lessonIdMatch[1] : '';
    
    const menuOrderMatch = itemXml.match(/<wp:menu_order>(\d+)<\/wp:menu_order>/);
    const menuOrder = menuOrderMatch ? parseInt(menuOrderMatch[1]) : 0;
    
    // Skip preview modules
    if (title.toLowerCase().includes('preview')) continue;
    
    if (postType === 'sfwd-courses' && wpPostId && title) {
      wpCourses[wpPostId] = title;
      continue;
    }
    
    // Module (sfwd-lessons in LearnDash)
    if (postType === 'sfwd-lessons' && title && wpCourseId) {
      const formattedDescription = formatContent(content);
      const youtubeUrls = extractYouTubeUrls(content);
      const spotifyUrls = extractSpotifyUrls(content);
      
      const mod: ParsedModule = {
        title,
        wpPostId,
        wpCourseId,
        content,
        formattedDescription,
        youtubeUrls,
        spotifyUrls,
        listeningReferences: [],
        order: menuOrder,
      };
      
      if (!modulesByCourse.has(wpCourseId)) modulesByCourse.set(wpCourseId, []);
      modulesByCourse.get(wpCourseId)!.push(mod);
      continue;
    }
    
    // Lesson (sfwd-topic in LearnDash)
    if (postType === 'sfwd-topic' && title && wpCourseId) {
      const formattedContent = formatContent(content);
      const soundsliceUrl = extractSoundsliceUrl(content);
      const hostedVideo = extractHostedVideoUrl(content);
      const youtubeUrls = extractYouTubeUrls(content);
      
      let videoUrl = soundsliceUrl || hostedVideo || (youtubeUrls.length > 0 ? youtubeUrls[0] : null);
      const lessonType = determineLessonType(content);
      
      const lesson: ParsedLesson = {
        title,
        wpPostId,
        wpLessonId: wpLessonId || '',
        wpCourseId,
        content,
        videoUrl,
        soundsliceUrl,
        formattedContent,
        lessonType,
        listeningReferences: [],
        order: menuOrder,
      };
      
      if (wpLessonId) {
        if (!lessonsByModule.has(wpLessonId)) lessonsByModule.set(wpLessonId, []);
        lessonsByModule.get(wpLessonId)!.push(lesson);
        wpLessonToModuleMap.set(lesson.wpPostId, wpLessonId);
      }
    }
  }
  
  // Sort modules and lessons by order, then assign sequential indices
  for (const [courseId, mods] of modulesByCourse) {
    mods.sort((a, b) => a.order - b.order);
    mods.forEach((m, idx) => {
      m.order = idx;
      modules.push(m);
    });
  }
  
  for (const [moduleId, lsns] of lessonsByModule) {
    lsns.sort((a, b) => a.order - b.order);
    lsns.forEach((l, idx) => {
      l.order = idx;
      lessons.push(l);
    });
  }
  
  console.log(`[parse] Found ${Object.keys(wpCourses).length} courses, ${modules.length} modules, ${lessons.length} lessons`);
  
  return { modules, lessons, wpCourses, wpLessonToModuleMap };
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

    // REBUILD: Delete all and recreate from XML
    if (action === 'rebuild') {
      const xmlContent = body?.xmlContent as string;
      const dryRun = body?.dryRun !== false;
      
      if (!xmlContent) {
        return new Response(JSON.stringify({ success: false, error: 'XML content required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`[rebuild] Starting ${dryRun ? 'DRY RUN' : 'LIVE'} rebuild...`);
      
      // Parse XML
      const { modules: wpModules, lessons: wpLessons, wpCourses, wpLessonToModuleMap } = parseWordPressXML(xmlContent);
      
      // Load existing courses from DB
      const { data: dbCourses } = await supabase.from('courses').select('id, title');
      
      // Build WP course ID -> DB course ID mapping
      const wpToDbCourse = new Map<string, { id: string; title: string }>();
      for (const [wpId, wpTitle] of Object.entries(wpCourses)) {
        const normalizedWpTitle = normalizeTitle(wpTitle);
        const dbCourse = (dbCourses || []).find(c => {
          const dbNorm = normalizeTitle(c.title);
          return dbNorm === normalizedWpTitle || 
                 dbNorm.includes(normalizedWpTitle) || 
                 normalizedWpTitle.includes(dbNorm);
        });
        if (dbCourse) {
          wpToDbCourse.set(wpId, { id: dbCourse.id, title: dbCourse.title });
        }
      }
      
      console.log(`[rebuild] Mapped ${wpToDbCourse.size}/${Object.keys(wpCourses).length} WP courses to DB courses`);
      
      // Group modules by course
      const modulesByCourse = new Map<string, ParsedModule[]>();
      for (const m of wpModules) {
        const dbCourse = wpToDbCourse.get(m.wpCourseId);
        if (!dbCourse) continue;
        if (!modulesByCourse.has(dbCourse.id)) modulesByCourse.set(dbCourse.id, []);
        modulesByCourse.get(dbCourse.id)!.push(m);
      }
      
      const results = {
        coursesProcessed: 0,
        modulesDeleted: 0,
        lessonsDeleted: 0,
        modulesCreated: 0,
        lessonsCreated: 0,
        errors: [] as string[],
        courseDetails: [] as { course: string; modules: number; lessons: number }[],
      };
      
      // Process each course
      for (const [dbCourseId, mods] of modulesByCourse) {
        const courseTitle = (dbCourses || []).find(c => c.id === dbCourseId)?.title || dbCourseId;
        console.log(`[rebuild] Processing ${courseTitle}: ${mods.length} modules`);
        
        if (!dryRun) {
          // Delete existing lessons for this course's modules
          const { data: existingModules } = await supabase
            .from('course_modules')
            .select('id')
            .eq('course_id', dbCourseId);
          
          if (existingModules && existingModules.length > 0) {
            const moduleIds = existingModules.map(m => m.id);
            const { error: lessonDelError, count: deletedLessons } = await supabase
              .from('module_lessons')
              .delete({ count: 'exact' })
              .in('module_id', moduleIds);
            
            if (lessonDelError) {
              results.errors.push(`Failed to delete lessons for ${courseTitle}: ${lessonDelError.message}`);
            } else {
              results.lessonsDeleted += deletedLessons || 0;
            }
          }
          
          // Delete existing modules for this course
          const { error: modDelError, count: deletedModules } = await supabase
            .from('course_modules')
            .delete({ count: 'exact' })
            .eq('course_id', dbCourseId);
          
          if (modDelError) {
            results.errors.push(`Failed to delete modules for ${courseTitle}: ${modDelError.message}`);
            continue;
          }
          results.modulesDeleted += deletedModules || 0;
        }
        
        // Create new modules
        const wpModuleToDbModule = new Map<string, string>();
        let courseModuleCount = 0;
        let courseLessonCount = 0;
        
        for (const mod of mods) {
          // Build full description with embeds
          let description = mod.formattedDescription;
          if (mod.youtubeUrls.length > 0) {
            description += '\n\n**Video Resources:**\n' + mod.youtubeUrls.join('\n');
          }
          if (mod.spotifyUrls.length > 0) {
            description += '\n\n**Listening:**\n' + mod.spotifyUrls.join('\n');
          }
          
          const moduleData = {
            course_id: dbCourseId,
            title: mod.title,
            description: description || null,
            order_index: mod.order,
            color_theme: 'earth',
            icon_type: 'mountain',
          };
          
          if (!dryRun) {
            const { data: newModule, error: modError } = await supabase
              .from('course_modules')
              .insert(moduleData)
              .select('id')
              .single();
            
            if (modError || !newModule) {
              results.errors.push(`Failed to create module ${mod.title}: ${modError?.message}`);
              continue;
            }
            
            wpModuleToDbModule.set(mod.wpPostId, newModule.id);
            results.modulesCreated++;
            courseModuleCount++;
            
            // Create lessons for this module
            const moduleLessons = wpLessons.filter(l => l.wpLessonId === mod.wpPostId);
            
            for (const lesson of moduleLessons) {
              const lessonData = {
                module_id: newModule.id,
                title: lesson.title,
                content: lesson.formattedContent || null,
                video_url: lesson.videoUrl,
                lesson_type: lesson.lessonType,
                order_index: lesson.order,
                listening_references: lesson.listeningReferences.length > 0 ? lesson.listeningReferences : null,
              };
              
              const { error: lessonError } = await supabase
                .from('module_lessons')
                .insert(lessonData);
              
              if (lessonError) {
                results.errors.push(`Failed to create lesson ${lesson.title}: ${lessonError.message}`);
              } else {
                results.lessonsCreated++;
                courseLessonCount++;
              }
            }
          } else {
            courseModuleCount++;
            const moduleLessons = wpLessons.filter(l => l.wpLessonId === mod.wpPostId);
            courseLessonCount += moduleLessons.length;
          }
        }
        
        results.coursesProcessed++;
        results.courseDetails.push({
          course: courseTitle,
          modules: courseModuleCount,
          lessons: courseLessonCount,
        });
      }
      
      console.log(`[rebuild] Complete. Created ${results.modulesCreated} modules, ${results.lessonsCreated} lessons`);
      
      return new Response(JSON.stringify({
        success: true,
        dryRun,
        ...results,
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
      
      const courseLessons = new Map<string, number>();
      for (const l of lessons) {
        const courseName = wpCourses[l.wpCourseId] || `WP Course ${l.wpCourseId}`;
        courseLessons.set(courseName, (courseLessons.get(courseName) || 0) + 1);
      }
      
      const summary = Array.from(courseModules.entries()).map(([courseName, mods]) => ({
        course: courseName,
        moduleCount: mods.length,
        lessonCount: courseLessons.get(courseName) || 0,
        modules: mods.map(m => ({
          title: m.title,
          hasContent: m.formattedDescription.length > 20,
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

    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Invalid action. Use: audit, parse-xml, or rebuild' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[full-content-sync] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
