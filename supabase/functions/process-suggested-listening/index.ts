import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sales / promo patterns to strip (case-insensitive)
const SALES_PATTERNS = [
  /enroll\s*now/gi,
  /join\s*the\s*course/gi,
  /get\s*access/gi,
  /limited\s*time/gi,
  /sign\s*up/gi,
  /buy\s*now/gi,
  /afropop\s*promo/gi,
  /contact\s*form/gi,
  /subscribe\s*(now|today|here)/gi,
  /click\s*here\s*to\s*(enroll|join|sign|buy|get)/gi,
  /start\s*your\s*(free\s*)?trial/gi,
  /discount\s*code/gi,
  /coupon/gi,
  /use\s*code/gi,
  /special\s*offer/gi,
  /exclusive\s*deal/gi,
  /early\s*bird/gi,
  /save\s*\d+%/gi,
  /\$\d+\s*(off|discount)/gi,
  /free\s*preview/gi,
  /unlock\s*(full\s*)?access/gi,
  /premium\s*member/gi,
  /upgrade\s*(now|today|your)/gi,
];

// Check if a line is a sales/promo line
function isSalesLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return SALES_PATTERNS.some(p => p.test(trimmed));
}

// Extract YouTube video ID from a URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Extract Spotify embed path from a URL
function extractSpotifyPath(url: string): string | null {
  const m = url.match(/(?:open\.)?spotify\.com\/(?:embed\/)?(track|album|playlist|artist)\/([a-zA-Z0-9]+)/);
  return m ? `${m[1]}/${m[2]}` : null;
}

// Check if a line looks like a track entry: "Title" – Artist or Title – Artist
function isTrackEntry(line: string): boolean {
  const trimmed = line.trim();
  // Has an em/en dash or double hyphen separating parts
  if (/[–—]/.test(trimmed) || / - /.test(trimmed)) {
    // Avoid matching section headers that are too long
    const parts = trimmed.split(/\s*[–—]\s*|\s+-\s+/);
    if (parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0) {
      // Not a paragraph (track entries are usually short)
      return trimmed.length < 200;
    }
  }
  return false;
}

// Check if a line is a section heading (short, no period, often title case)
function isSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 150) return false;
  if (trimmed.endsWith('.') || trimmed.endsWith(',')) return false;
  // Contains em dash as a subtitle separator
  if (/[–—]/.test(trimmed) && isTrackEntry(trimmed)) return false;
  // Short lines that look like headings
  const words = trimmed.split(/\s+/);
  if (words.length <= 12 && !trimmed.includes('. ')) return true;
  return false;
}

// Convert raw plain text content to semantic HTML
function convertToHtml(content: string, spotifyUrls: string[], youtubeUrls: string[]): string {
  const lines = content.split('\n');
  const htmlParts: string[] = [];
  let inTrackList = false;
  let trackListItems: string[] = [];
  const processedEmbeds = new Set<string>();

  function flushTrackList() {
    if (trackListItems.length > 0) {
      htmlParts.push('<ul class="sl-track-list">');
      for (const item of trackListItems) {
        htmlParts.push(`  <li class="sl-track-item">${item}</li>`);
      }
      htmlParts.push('</ul>');
      trackListItems = [];
    }
    inTrackList = false;
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      if (inTrackList) flushTrackList();
      continue;
    }

    // Strip &nbsp; entities
    line = line.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

    // Skip sales lines
    if (isSalesLine(line)) continue;

    // Check for YouTube URL on its own line
    const ytId = extractYouTubeId(line);
    if (ytId && line.match(/^(https?:\/\/)?/)) {
      flushTrackList();
      if (!processedEmbeds.has(`yt-${ytId}`)) {
        processedEmbeds.add(`yt-${ytId}`);
        htmlParts.push(`<div class="sl-embed sl-embed--youtube"><iframe src="https://www.youtube.com/embed/${ytId}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`);
      }
      continue;
    }

    // Check for Spotify URL on its own line
    const spPath = extractSpotifyPath(line);
    if (spPath && line.match(/^(https?:\/\/)?/)) {
      flushTrackList();
      if (!processedEmbeds.has(`sp-${spPath}`)) {
        processedEmbeds.add(`sp-${spPath}`);
        htmlParts.push(`<div class="sl-embed sl-embed--spotify"><iframe src="https://open.spotify.com/embed/${spPath}" width="100%" height="152" allow="encrypted-media" loading="lazy" title="Spotify player"></iframe></div>`);
      }
      continue;
    }

    // Skip bare URLs that aren't embeds
    if (/^https?:\/\//.test(line) && !line.includes(' ')) continue;

    // Check for track entries
    if (isTrackEntry(line)) {
      if (!inTrackList) inTrackList = true;
      // Format: wrap title in strong, artist in span
      const parts = line.split(/\s*[–—]\s*|\s+-\s+/);
      const title = parts[0].replace(/^[""]|[""]$/g, '').trim();
      const artist = parts.slice(1).join(' – ').trim();
      trackListItems.push(`<span class="sl-track-title">${title}</span><span class="sl-track-artist">${artist}</span>`);
      continue;
    }

    flushTrackList();

    // Check if it's a heading-like line (short, no period at end)
    if (isSectionHeading(line) && !line.startsWith('"') && line.length < 100) {
      // Check if next non-empty line is a track or another heading
      const isSubheading = line.split(/\s*[–—]\s*/).length > 1;
      if (isSubheading) {
        const headParts = line.split(/\s*[–—]\s*/);
        htmlParts.push(`<h3 class="sl-section-heading">${headParts[0].trim()}</h3>`);
        if (headParts[1]) {
          htmlParts.push(`<p class="sl-section-subtitle">${headParts[1].trim()}</p>`);
        }
      } else {
        // Determine heading level based on context
        htmlParts.push(`<h3 class="sl-section-heading">${line}</h3>`);
      }
      continue;
    }

    // Regular paragraph
    // Clean up: bold markers
    let cleaned = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    htmlParts.push(`<p class="sl-paragraph">${cleaned}</p>`);
  }

  flushTrackList();

  // Now add any Spotify/YouTube URLs from the dedicated DB fields that weren't already embedded
  for (const url of youtubeUrls) {
    const ytId = extractYouTubeId(url);
    if (ytId && !processedEmbeds.has(`yt-${ytId}`)) {
      processedEmbeds.add(`yt-${ytId}`);
      htmlParts.push(`<div class="sl-embed sl-embed--youtube"><iframe src="https://www.youtube.com/embed/${ytId}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`);
    }
  }
  for (const url of spotifyUrls) {
    const spPath = extractSpotifyPath(url);
    if (spPath && !processedEmbeds.has(`sp-${spPath}`)) {
      processedEmbeds.add(`sp-${spPath}`);
      htmlParts.push(`<div class="sl-embed sl-embed--spotify"><iframe src="https://open.spotify.com/embed/${spPath}" width="100%" height="152" allow="encrypted-media" loading="lazy" title="Spotify player"></iframe></div>`);
    }
  }

  return `<div class="suggested-listening">${htmlParts.join('\n')}</div>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional body for specific lesson IDs
    let targetIds: string[] | null = null;
    try {
      const body = await req.json();
      if (body?.lessonIds && Array.isArray(body.lessonIds)) {
        targetIds = body.lessonIds;
      }
    } catch {
      // No body provided, process all
    }

    // Fetch lessons with "Suggested Listening" in title
    let query = supabase
      .from('module_lessons')
      .select('id, title, content, spotify_urls, youtube_urls')
      .ilike('title', '%suggested listening%');

    if (targetIds) {
      query = query.in('id', targetIds);
    }

    const { data: lessons, error: fetchError } = await query;

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lessons || lessons.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No suggested listening lessons found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${lessons.length} suggested listening lessons...`);

    let processed = 0;
    let errors = 0;
    const results: { id: string; title: string; status: string }[] = [];

    for (const lesson of lessons) {
      try {
        if (!lesson.content) {
          results.push({ id: lesson.id, title: lesson.title, status: 'skipped_no_content' });
          continue;
        }

        const spotifyUrls: string[] = lesson.spotify_urls || [];
        const youtubeUrls: string[] = lesson.youtube_urls || [];

        const cleanedHtml = convertToHtml(lesson.content, spotifyUrls, youtubeUrls);

        const { error: updateError } = await supabase
          .from('module_lessons')
          .update({ suggested_listening_content: cleanedHtml })
          .eq('id', lesson.id);

        if (updateError) {
          console.error(`Update error for ${lesson.id}:`, updateError);
          results.push({ id: lesson.id, title: lesson.title, status: `error: ${updateError.message}` });
          errors++;
        } else {
          results.push({ id: lesson.id, title: lesson.title, status: 'processed' });
          processed++;
        }
      } catch (err) {
        console.error(`Error processing lesson ${lesson.id}:`, err);
        results.push({ id: lesson.id, title: lesson.title, status: `error: ${err instanceof Error ? err.message : 'unknown'}` });
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: lessons.length,
        processed,
        errors,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in process-suggested-listening:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
