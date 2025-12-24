import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type MediaType = 'youtube' | 'spotify';

interface MediaEmbed {
  type: MediaType;
  /** Canonical non-embed URL (preferred for storing in text fields) */
  url: string;
  /** Embed URL (useful when storing in a dedicated video_url field) */
  embedUrl: string;
}

interface ParsedWpItem {
  title: string;
  wpPostType: string;
  wpPostId: string;
  wpCourseId: string | null;
  link: string | null;
  content: string;
  embeds: MediaEmbed[];
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-');
}

function normalizeTitle(title: string): string {
  return decodeBasicEntities(title)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTrailingTimecode(title: string): string {
  // e.g. "Some Lesson - 58.08" or "Some Lesson - 3.05"
  return title.replace(/\s*[-–—]\s*\d{1,3}\.\d{1,2}\s*$/g, '').trim();
}

function looksLikeModuleTitle(title: string): boolean {
  return /^module\s*\d+\b/i.test(title.trim());
}

// Extract YouTube IDs and URLs from content
function extractYouTubeEmbeds(content: string): MediaEmbed[] {
  const embeds: MediaEmbed[] = [];

  // Match iframe embeds (youtube + youtube-nocookie)
  const iframePattern =
    /src=["']https?:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/([a-zA-Z0-9_-]{11})[^"']*["']/gi;
  let match: RegExpExecArray | null;
  while ((match = iframePattern.exec(content)) !== null) {
    const videoId = match[1];
    embeds.push({
      type: 'youtube',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    });
  }

  // Match regular YouTube URLs
  const urlPattern =
    /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;
  while ((match = urlPattern.exec(content)) !== null) {
    const videoId = match[1];
    const exists = embeds.some((e) => e.url.includes(videoId));
    if (!exists) {
      embeds.push({
        type: 'youtube',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      });
    }
  }

  return embeds;
}

// Extract Spotify embeds from content
function extractSpotifyEmbeds(content: string): MediaEmbed[] {
  const embeds: MediaEmbed[] = [];

  // Match Spotify iframe embeds
  const iframePattern =
    /src=["']https?:\/\/open\.spotify\.com\/embed\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)[^"']*["']/gi;
  let match: RegExpExecArray | null;
  while ((match = iframePattern.exec(content)) !== null) {
    const type = match[1];
    const id = match[2];
    embeds.push({
      type: 'spotify',
      url: `https://open.spotify.com/${type}/${id}`,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}`,
    });
  }

  // Match regular Spotify URLs
  const urlPattern = /https?:\/\/open\.spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/gi;
  while ((match = urlPattern.exec(content)) !== null) {
    const type = match[1];
    const id = match[2];
    const exists = embeds.some((e) => e.url.includes(id));
    if (!exists) {
      embeds.push({
        type: 'spotify',
        url: `https://open.spotify.com/${type}/${id}`,
        embedUrl: `https://open.spotify.com/embed/${type}/${id}`,
      });
    }
  }

  return embeds;
}

function extractEmbeds(content: string): MediaEmbed[] {
  const all = [...extractYouTubeEmbeds(content), ...extractSpotifyEmbeds(content)];
  // de-dupe by type+url
  const seen = new Set<string>();
  return all.filter((e) => {
    const key = `${e.type}:${e.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Parse WordPress XML to extract items (only those with YouTube/Spotify embeds)
function parseWordPressXML(xmlContent: string): {
  itemsWithEmbeds: ParsedWpItem[];
  wpCoursesById: Record<string, { title: string }>;
} {
  const wpCoursesById: Record<string, { title: string }> = {};
  const itemsWithEmbeds: ParsedWpItem[] = [];

  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemPattern.exec(xmlContent)) !== null) {
    const itemXml = itemMatch[1];

    const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title><!\[CDATA\[([\s\S]*?)\]\]<\/title>|<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
    // fallback simpler
    const fallbackTitleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
    const rawTitle =
      (titleMatch && (titleMatch[1] || titleMatch[2] || titleMatch[3] || titleMatch[4] || titleMatch[5] || titleMatch[6])) ||
      (fallbackTitleMatch && (fallbackTitleMatch[1] || fallbackTitleMatch[2] || fallbackTitleMatch[3])) ||
      '';

    const postTypeMatch = itemXml.match(/<wp:post_type><!\[CDATA\[([\s\S]*?)\]\]><\/wp:post_type>/);
    const wpPostType = postTypeMatch ? postTypeMatch[1] : '';

    const postIdMatch = itemXml.match(/<wp:post_id>(\d+)<\/wp:post_id>/);
    const wpPostId = postIdMatch ? postIdMatch[1] : '';

    const linkMatch = itemXml.match(/<link>([^<]+)<\/link>/);
    const link = linkMatch ? linkMatch[1] : null;

    const contentMatch = itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    const content = contentMatch ? contentMatch[1] : '';

    // Extract course ID from meta (for lesson/topic items)
    const courseIdMatch = itemXml.match(
      /<wp:meta_key><!\[CDATA\[course_id\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(\d+)\]\]><\/wp:meta_value>/,
    );
    const wpCourseId = courseIdMatch ? courseIdMatch[1] : null;

    const title = decodeBasicEntities(rawTitle).trim();

    // capture WP courses for mapping
    if (wpPostType === 'sfwd-courses' && wpPostId && title) {
      wpCoursesById[wpPostId] = { title };
      continue;
    }

    // Only keep items with embeds for performance
    if (!content || !title) continue;
    const embeds = extractEmbeds(content);
    if (embeds.length === 0) continue;

    itemsWithEmbeds.push({
      title,
      wpPostType,
      wpPostId,
      wpCourseId,
      link,
      content,
      embeds,
    });
  }

  return { itemsWithEmbeds, wpCoursesById };
}

function findBestCourseMatch(
  wpCourseTitle: string,
  dbCourses: Array<{ id: string; title: string }>,
): { id: string; title: string } | null {
  const wpNorm = normalizeTitle(wpCourseTitle);

  // 1) exact normalized match
  for (const c of dbCourses) {
    if (normalizeTitle(c.title) === wpNorm) return c;
  }

  // 2) contains match (prefer longest overlap)
  let best: { course: { id: string; title: string }; score: number } | null = null;
  for (const c of dbCourses) {
    const dbNorm = normalizeTitle(c.title);
    if (dbNorm.includes(wpNorm) || wpNorm.includes(dbNorm)) {
      const score = Math.min(dbNorm.length, wpNorm.length);
      if (!best || score > best.score) best = { course: c, score };
    }
  }

  return best?.course || null;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing backend environment variables');
      return new Response(JSON.stringify({ success: false, error: 'Backend not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const action = body?.action as string | undefined;

    if (action === 'parse-xml') {
      const xmlContent = body?.xmlContent as string | undefined;
      if (!xmlContent) {
        return new Response(JSON.stringify({ success: false, error: 'XML content is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { itemsWithEmbeds } = parseWordPressXML(xmlContent);
      const youtubeCount = itemsWithEmbeds.flatMap((i) => i.embeds).filter((e) => e.type === 'youtube').length;
      const spotifyCount = itemsWithEmbeds.flatMap((i) => i.embeds).filter((e) => e.type === 'spotify').length;

      const modulesWithEmbeds = itemsWithEmbeds.filter((i) => looksLikeModuleTitle(i.title));
      const lessonsWithEmbeds = itemsWithEmbeds.filter((i) => !looksLikeModuleTitle(i.title));

      return new Response(
        JSON.stringify({
          success: true,
          summary: {
            totalItemsWithEmbeds: itemsWithEmbeds.length,
            youtubeEmbeds: youtubeCount,
            spotifyEmbeds: spotifyCount,
            modulesWithEmbeds: modulesWithEmbeds.length,
            lessonsWithEmbeds: lessonsWithEmbeds.length,
          },
          // keep response small
          modulesWithEmbeds: modulesWithEmbeds.slice(0, 100),
          lessonsWithEmbeds: lessonsWithEmbeds.slice(0, 100),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'sync-embeds') {
      const xmlContent = body?.xmlContent as string | undefined;
      if (!xmlContent) {
        return new Response(JSON.stringify({ success: false, error: 'XML content is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[process-wordpress-xml] sync-embeds: parsing XML');
      const { itemsWithEmbeds, wpCoursesById } = parseWordPressXML(xmlContent);

      // Load DB data
      const [{ data: courses, error: coursesErr }, { data: modules, error: modulesErr }, { data: lessons, error: lessonsErr }] =
        await Promise.all([
          supabase.from('courses').select('id,title'),
          supabase.from('course_modules').select('id,course_id,title,description'),
          supabase.from('module_lessons').select('id,module_id,title,content,video_url'),
        ]);

      if (coursesErr) throw new Error(coursesErr.message);
      if (modulesErr) throw new Error(modulesErr.message);
      if (lessonsErr) throw new Error(lessonsErr.message);

      const dbCourses = courses || [];
      const dbModules = modules || [];
      const dbLessons = lessons || [];

      // course matching map: wpCourseId -> dbCourse
      const wpCourseToDbCourseId: Record<string, string> = {};
      for (const [wpId, info] of Object.entries(wpCoursesById)) {
        const match = findBestCourseMatch(info.title, dbCourses);
        if (match) wpCourseToDbCourseId[wpId] = match.id;
      }

      // Build fast maps for modules/lessons by (course_id + normalized title)
      const moduleByKey = new Map<string, { id: string; description: string | null }>();
      for (const m of dbModules) {
        const t1 = normalizeTitle(m.title);
        const t2 = normalizeTitle(stripTrailingTimecode(m.title));
        moduleByKey.set(`${m.course_id}|${t1}`, { id: m.id, description: m.description ?? null });
        moduleByKey.set(`${m.course_id}|${t2}`, { id: m.id, description: m.description ?? null });
      }

      const moduleCourseById = new Map<string, string>();
      for (const m of dbModules) moduleCourseById.set(m.id, m.course_id);

      const lessonByKey = new Map<string, { id: string; content: string | null; video_url: string | null }>();
      for (const l of dbLessons) {
        const courseId = moduleCourseById.get(l.module_id);
        if (!courseId) continue;
        const t1 = normalizeTitle(l.title);
        const t2 = normalizeTitle(stripTrailingTimecode(l.title));
        lessonByKey.set(`${courseId}|${t1}`, { id: l.id, content: l.content ?? null, video_url: l.video_url ?? null });
        lessonByKey.set(`${courseId}|${t2}`, { id: l.id, content: l.content ?? null, video_url: l.video_url ?? null });
      }

      const moduleUpdates: Array<{ id: string; description: string }> = [];
      const lessonUpdates: Array<{ id: string; content?: string; video_url?: string | null }> = [];

      const notFound: { kind: 'module' | 'lesson'; title: string; wpCourseId: string | null }[] = [];

      let modulesUpdated = 0;
      let lessonsUpdated = 0;
      let linksAddedToModules = 0;
      let linksAddedToLessons = 0;

      console.log(`[process-wordpress-xml] itemsWithEmbeds=${itemsWithEmbeds.length}`);

      for (const item of itemsWithEmbeds) {
        const dbCourseId = item.wpCourseId ? wpCourseToDbCourseId[item.wpCourseId] : undefined;
        if (!dbCourseId) {
          notFound.push({ kind: looksLikeModuleTitle(item.title) ? 'module' : 'lesson', title: item.title, wpCourseId: item.wpCourseId });
          continue;
        }

        const normTitle = normalizeTitle(item.title);
        const normTitleNoSuffix = normalizeTitle(stripTrailingTimecode(item.title));

        const urls = uniq(item.embeds.map((e) => e.url));

        // Prefer matching module if it looks like a module title
        if (looksLikeModuleTitle(item.title)) {
          const mod = moduleByKey.get(`${dbCourseId}|${normTitle}`) || moduleByKey.get(`${dbCourseId}|${normTitleNoSuffix}`);
          if (!mod) {
            notFound.push({ kind: 'module', title: item.title, wpCourseId: item.wpCourseId });
            continue;
          }

          const existing = mod.description || '';
          const missing = urls.filter((u) => !existing.includes(u));
          if (missing.length > 0) {
            const nextDesc = `${existing}`.trim();
            const updated = `${nextDesc}${nextDesc ? '\n\n' : ''}${missing.join('\n')}`.trim();
            moduleUpdates.push({ id: mod.id, description: updated });
            modulesUpdated++;
            linksAddedToModules += missing.length;
          }
          continue;
        }

        // Otherwise treat as lesson page
        const lesson = lessonByKey.get(`${dbCourseId}|${normTitle}`) || lessonByKey.get(`${dbCourseId}|${normTitleNoSuffix}`);
        if (!lesson) {
          notFound.push({ kind: 'lesson', title: item.title, wpCourseId: item.wpCourseId });
          continue;
        }

        const update: { id: string; content?: string; video_url?: string | null } = { id: lesson.id };

        // If lesson has no video_url at all, set a YouTube URL first, else Spotify as fallback
        if (!lesson.video_url) {
          const youtube = item.embeds.find((e) => e.type === 'youtube');
          const spotify = item.embeds.find((e) => e.type === 'spotify');
          if (youtube) update.video_url = youtube.url;
          else if (spotify) update.video_url = spotify.url;
        }

        // Always append missing URLs to lesson.content so we can render all embeds (even if video_url is used for Soundslice)
        const existingContent = lesson.content || '';
        const missing = urls.filter((u) => !existingContent.includes(u));
        if (missing.length > 0) {
          const nextContent = `${existingContent}`.trim();
          update.content = `${nextContent}${nextContent ? '\n\n' : ''}${missing.join('\n')}`.trim();
          linksAddedToLessons += missing.length;
        }

        if (update.content !== undefined || update.video_url !== undefined) {
          lessonUpdates.push(update);
          lessonsUpdated++;
        }
      }

      console.log(
        `[process-wordpress-xml] prepared updates: modules=${moduleUpdates.length}, lessons=${lessonUpdates.length}`,
      );

      // Apply updates in batches
      if (moduleUpdates.length > 0) {
        const { error } = await supabase.from('course_modules').upsert(moduleUpdates, { onConflict: 'id' });
        if (error) throw new Error(error.message);
      }
      if (lessonUpdates.length > 0) {
        const { error } = await supabase.from('module_lessons').upsert(lessonUpdates, { onConflict: 'id' });
        if (error) throw new Error(error.message);
      }

      return new Response(
        JSON.stringify({
          success: true,
          results: {
            itemsWithEmbeds: itemsWithEmbeds.length,
            modulesUpdated,
            lessonsUpdated,
            linksAddedToModules,
            linksAddedToLessons,
            notFoundCount: notFound.length,
            notFoundSample: notFound.slice(0, 50),
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing WordPress XML:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
