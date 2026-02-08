/**
 * Pre-process blog post HTML to convert plain video URLs
 * into structured embed markup that html-react-parser can
 * then replace with React components.
 *
 * It handles:
 *  - Plain YouTube URLs (watch?v=, youtu.be/, shorts/)
 *  - Existing YouTube iframes → wraps in embed container
 *  - Instagram/Facebook/TikTok iframes → wraps in social container
 *  - Bare IG/FB links → converts to oEmbed iframes
 */

// ── YouTube helpers ─────────────────────────────────────────────

const YT_URL_RE =
  /(?:<p>)?\s*(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})(?:[^\s<]*)?\s*(?:<\/p>)?/gi;

const YT_IFRAME_RE =
  /<iframe[^>]*src=["'](?:https?:)?\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})[^"']*["'][^>]*>[\s\S]*?<\/iframe>/gi;

export function extractYouTubeId(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/) ?? null;
  return m ? m[1] : null;
}

// ── Social iframe helpers ───────────────────────────────────────

const SOCIAL_IFRAME_RE =
  /<iframe[^>]*src=["'](https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|fb\.com|tiktok\.com)[^"']*?)["'][^>]*>[\s\S]*?<\/iframe>/gi;

function detectPlatform(url: string): 'instagram' | 'facebook' | 'tiktok' | null {
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/facebook\.com|fb\.com/i.test(url)) return 'facebook';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  return null;
}

// ── Bare social URL patterns ────────────────────────────────────

const BARE_INSTAGRAM_RE =
  /(?:<p>)?\s*(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[\w-]+\/?[^\s<]*)\s*(?:<\/p>)?/gi;

// ── Main preprocessor ───────────────────────────────────────────

export function preprocessContent(html: string): string {
  let result = html;

  // 1. Replace existing YouTube iframes with our custom tag
  result = result.replace(YT_IFRAME_RE, (_match, videoId) => {
    return `<div data-youtube-embed="${videoId}"></div>`;
  });

  // 2. Replace plain YouTube URLs with our custom tag
  result = result.replace(YT_URL_RE, (_match, videoId) => {
    return `<div data-youtube-embed="${videoId}"></div>`;
  });

  // 3. Wrap existing social iframes
  result = result.replace(SOCIAL_IFRAME_RE, (match, src) => {
    const platform = detectPlatform(src);
    if (!platform) return match;
    return `<div data-social-embed="${platform}" data-social-src="${src}"></div>`;
  });

  // 4. Convert bare Instagram URLs to embed tags
  result = result.replace(BARE_INSTAGRAM_RE, (_match, url) => {
    const embedUrl = url.replace(/\/?$/, '/embed');
    return `<div data-social-embed="instagram" data-social-src="${embedUrl}"></div>`;
  });

  return result;
}
