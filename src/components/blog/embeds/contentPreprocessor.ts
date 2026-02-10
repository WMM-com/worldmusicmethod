/**
 * Pre-process blog post HTML to convert plain video URLs
 * into structured embed markup that html-react-parser can
 * then replace with React components.
 *
 * WordPress stores YouTube links in various formats:
 *  - <figure class="wp-block-embed..."><div class="wp-block-embed__wrapper">\n URL \n</div></figure>
 *  - <p>https://youtube.com/watch?v=XXX</p>
 *  - <a href="...">https://youtube.com/watch?v=XXX</a>
 *  - Existing <iframe> embeds
 */

// ── YouTube helpers ─────────────────────────────────────────────

// Match WordPress embed blocks wrapping a YouTube URL (including embed-handler variants)
const WP_EMBED_BLOCK_RE =
  /<figure[^>]*wp-block-embed[^>]*>[\s\S]*?<div[^>]*wp-block-embed__wrapper[^>]*>\s*(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})[^\s<]*)\s*<\/div>[\s\S]*?<\/figure>/gi;

// Match YouTube URLs inside <a> tags
const YT_ANCHOR_RE =
  /<a[^>]*href=["'](?:https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})[^"']*)["'][^>]*>[^<]*<\/a>/gi;

// Match plain YouTube URLs (possibly wrapped in <p> or <div>)
const YT_URL_RE =
  /(?:<(?:p|div)[^>]*>)?\s*(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})(?:[^\s<]*)?\s*(?:<\/(?:p|div)>)?/gi;

// Match existing YouTube iframes
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

// ── Sentinel ────────────────────────────────────────────────────
// We use a class-based sentinel instead of data-* attributes because
// DOMPurify strips unknown data attributes.
const ytTag = (id: string) =>
  `<div class="yt-embed-placeholder" id="yt-${id}"></div>`;

const socialTag = (platform: string, src: string) =>
  `<div class="social-embed-placeholder" id="social-${platform}" title="${src}"></div>`;

// ── Main preprocessor ───────────────────────────────────────────

export function preprocessContent(html: string): string {
  let result = html;

  // 1. WordPress embed blocks (highest priority – most specific)
  result = result.replace(WP_EMBED_BLOCK_RE, (_match, _url, videoId) => {
    return ytTag(videoId);
  });

  // 2. Replace existing YouTube iframes
  result = result.replace(YT_IFRAME_RE, (_match, videoId) => {
    return ytTag(videoId);
  });

  // 3. YouTube URLs inside <a> tags
  result = result.replace(YT_ANCHOR_RE, (_match, videoId) => {
    return ytTag(videoId);
  });

  // 4. Plain YouTube URLs (in <p>, <div>, or bare)
  result = result.replace(YT_URL_RE, (_match, videoId) => {
    // Avoid double-replacing already-processed sentinels
    if (_match.includes('yt-embed-placeholder')) return _match;
    return ytTag(videoId);
  });

  // 5. Wrap existing social iframes
  result = result.replace(SOCIAL_IFRAME_RE, (match, src) => {
    const platform = detectPlatform(src);
    if (!platform) return match;
    return socialTag(platform, src);
  });

  // 6. Convert bare Instagram URLs to embed tags
  result = result.replace(BARE_INSTAGRAM_RE, (_match, url) => {
    const embedUrl = url.replace(/\/?$/, '/embed');
    return socialTag('instagram', embedUrl);
  });

  return result;
}
