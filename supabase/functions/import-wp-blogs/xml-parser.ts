// WordPress WXR XML parser – regex based (Deno-compatible)

export interface WpAuthor {
  login: string;
  displayName: string;
}

export interface WpPost {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  publishedAt: string;
  authorLogin: string;
  categories: string[];
  tags: string[];
  thumbnailId: string | null;
  postId: string;
  metaDescription: string | null;
}

function extractCDATA(text: string): string {
  const m = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1] : text.replace(/<[^>]*>/g, '').trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8212;/g, '\u2014')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D');
}

/** Parse all <wp:author> declarations */
export function parseAuthors(xml: string): Map<string, WpAuthor> {
  const map = new Map<string, WpAuthor>();
  const authorPattern = /<wp:author>[\s\S]*?<\/wp:author>/gi;
  let m: RegExpExecArray | null;
  while ((m = authorPattern.exec(xml)) !== null) {
    const block = m[0];
    const loginMatch = block.match(/<wp:author_login><!\[CDATA\[([\s\S]*?)\]\]><\/wp:author_login>/);
    const nameMatch = block.match(/<wp:author_display_name><!\[CDATA\[([\s\S]*?)\]\]><\/wp:author_display_name>/);
    if (loginMatch && nameMatch) {
      map.set(loginMatch[1], { login: loginMatch[1], displayName: nameMatch[1] });
    }
  }
  return map;
}

/** Parse all <item> elements that are posts (post_type = "post") */
export function parsePosts(xml: string): WpPost[] {
  const posts: WpPost[] = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemPattern.exec(xml)) !== null) {
    const item = itemMatch[1];

    // Check post_type
    const postTypeMatch = item.match(/<wp:post_type><!\[CDATA\[([\s\S]*?)\]\]><\/wp:post_type>/);
    const postType = postTypeMatch ? postTypeMatch[1].trim() : '';
    if (postType !== 'post') continue;

    // Check status (only published)
    const statusMatch = item.match(/<wp:status><!\[CDATA\[([\s\S]*?)\]\]><\/wp:status>/);
    const status = statusMatch ? statusMatch[1].trim() : '';
    if (status !== 'publish') continue;

    // Title
    const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
    const rawTitle = titleMatch ? titleMatch[1] : '';
    const title = decodeEntities(rawTitle).trim();
    if (!title) continue;

    // Slug (from wp:post_name)
    const slugMatch = item.match(/<wp:post_name><!\[CDATA\[([\s\S]*?)\]\]><\/wp:post_name>/);
    const slug = slugMatch ? slugMatch[1].trim() : '';
    if (!slug) continue;

    // Post ID
    const postIdMatch = item.match(/<wp:post_id>(\d+)<\/wp:post_id>/);
    const postId = postIdMatch ? postIdMatch[1] : '';

    // Content
    const contentMatch = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    const content = contentMatch ? contentMatch[1] : '';

    // Excerpt
    const excerptMatch = item.match(/<excerpt:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/excerpt:encoded>/);
    const excerpt = excerptMatch ? excerptMatch[1].trim() : '';

    // Published date
    const dateMatch = item.match(/<wp:post_date_gmt><!\[CDATA\[([\s\S]*?)\]\]><\/wp:post_date_gmt>/);
    const publishedAt = dateMatch ? dateMatch[1].trim() : '';

    // Author
    const authorMatch = item.match(/<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/);
    const authorLogin = authorMatch ? authorMatch[1].trim() : '';

    // Categories
    const categories: string[] = [];
    const catPattern = /<category\s+domain="category"[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/category>/gi;
    let catMatch: RegExpExecArray | null;
    while ((catMatch = catPattern.exec(item)) !== null) {
      const cat = catMatch[1].trim();
      if (cat && !categories.includes(cat)) categories.push(cat);
    }

    // Tags
    const tags: string[] = [];
    const tagPattern = /<category\s+domain="post_tag"[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/category>/gi;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagPattern.exec(item)) !== null) {
      const tag = tagMatch[1].trim();
      if (tag && !tags.includes(tag)) tags.push(tag);
    }

    // Thumbnail ID
    const thumbMatch = item.match(
      /<wp:meta_key><!\[CDATA\[_thumbnail_id\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(\d+)\]\]><\/wp:meta_value>/,
    );
    const thumbnailId = thumbMatch ? thumbMatch[1] : null;

    // RankMath SEO description
    const seoDescMatch = item.match(
      /<wp:meta_key><!\[CDATA\[rank_math_description\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_value>/,
    );
    const metaDescription = seoDescMatch ? decodeEntities(seoDescMatch[1].trim()) : null;

    posts.push({
      title,
      slug,
      content,
      excerpt,
      publishedAt,
      authorLogin,
      categories,
      tags,
      thumbnailId,
      postId,
      metaDescription,
    });
  }

  return posts;
}
