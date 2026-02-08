// HTML content cleaning & image extraction utilities

const R2_BASE = 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev';
const WP_DOMAIN = 'worldmusicmethod.com';

/** Convert a WordPress uploads URL to its R2 equivalent */
export function wpUrlToR2(url: string): string {
  if (!url) return '';
  // Already on R2
  if (url.includes('r2.dev')) return url;
  // WordPress uploads path → R2
  const pathMatch = url.match(/worldmusicmethod\.com\/wp-content\/uploads\/(.+)/);
  if (pathMatch) {
    return `${R2_BASE}/${pathMatch[1]}`;
  }
  return url;
}

/** Check if a URL is a WordPress-hosted image that needs downloading */
export function isWpHostedImage(url: string): boolean {
  return url.includes(WP_DOMAIN) && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

/** Extract all image URLs from HTML content */
export function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  // img src attributes
  const srcPattern = /src=["'](https?:\/\/[^\s"'<>]+?\.(jpg|jpeg|png|gif|webp)[^"']*?)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = srcPattern.exec(html)) !== null) {
    if (!urls.includes(m[1])) urls.push(m[1]);
  }
  // srcset values
  const srcsetPattern = /srcset=["']([^"']+)["']/gi;
  while ((m = srcsetPattern.exec(html)) !== null) {
    const parts = m[1].split(',');
    for (const part of parts) {
      const urlMatch = part.trim().match(/^(https?:\/\/[^\s]+)/);
      if (urlMatch && /\.(jpg|jpeg|png|gif|webp)/i.test(urlMatch[1]) && !urls.includes(urlMatch[1])) {
        urls.push(urlMatch[1]);
      }
    }
  }
  return urls;
}

/**
 * Clean WordPress HTML content:
 * - Strip WP block comments (<!-- wp:xxx --> / <!-- /wp:xxx -->)
 * - Strip full <html><head>…</head><body>…</body></html> wrappers
 * - Convert image URLs to R2
 * - Keep all embeds, links, media intact
 */
export function cleanContent(html: string, imageUrlMap: Map<string, string>): string {
  let cleaned = html;

  // Strip WordPress block comments
  cleaned = cleaned.replace(/<!--\s*\/?wp:[^>]*-->\s*/g, '');

  // Strip full HTML document wrappers (some posts wrap content in <!DOCTYPE html>…)
  cleaned = cleaned.replace(/<!DOCTYPE\s+html[^>]*>/gi, '');
  cleaned = cleaned.replace(/<html[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/html>/gi, '');
  cleaned = cleaned.replace(/<head>[\s\S]*?<\/head>/gi, '');
  cleaned = cleaned.replace(/<body[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/body>/gi, '');

  // Replace image URLs using the provided map (already-uploaded R2 URLs)
  for (const [oldUrl, newUrl] of imageUrlMap.entries()) {
    // Escape special regex chars in URL
    const escaped = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(escaped, 'g'), newUrl);
  }

  // Also do a general pass: convert any remaining WP upload URLs to R2
  cleaned = cleaned.replace(
    /https?:\/\/worldmusicmethod\.com\/wp-content\/uploads\/([^\s"'<>]+)/g,
    (match, path) => `${R2_BASE}/${path}`,
  );

  // Strip empty paragraphs
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');

  // Trim excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/** Calculate reading time in minutes from HTML content */
export function calculateReadingTime(html: string): number {
  // Strip HTML tags to get plain text
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  // Average reading speed: 200 words per minute
  return Math.max(1, Math.round(wordCount / 200));
}

/** Generate an excerpt from HTML if none provided */
export function generateExcerpt(html: string, maxLength = 160): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '…';
}
