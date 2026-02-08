import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featured_image: string | null;
  author_name: string | null;
  published_at: string | null;
  categories: string[] | null;
  reading_time: number | null;
  meta_title: string | null;
  meta_description: string | null;
}

export interface RelatedPostData {
  slug: string;
  title: string;
  featured_image: string | null;
  excerpt: string | null;
  reading_time: number | null;
}

export interface PopularPostData {
  slug: string;
  title: string;
  featured_image: string | null;
  published_at: string | null;
}

async function fetchPostBySlug(slug: string): Promise<BlogPostData | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, content, excerpt, featured_image, author_name, published_at, categories, reading_time, meta_title, meta_description')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchRelatedPosts(
  currentSlug: string,
  categories: string[] | null
): Promise<RelatedPostData[]> {
  // Try category-matched posts first
  if (categories && categories.length > 0) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, title, featured_image, excerpt, reading_time')
      .neq('slug', currentSlug)
      .not('published_at', 'is', null)
      .overlaps('categories', categories)
      .order('published_at', { ascending: false })
      .limit(3);

    if (!error && data && data.length >= 3) {
      return data;
    }

    // If we got some but < 3, supplement with latest posts
    if (!error && data && data.length > 0) {
      const existingSlugs = [currentSlug, ...data.map((p) => p.slug)];
      const { data: extra } = await supabase
        .from('blog_posts')
        .select('slug, title, featured_image, excerpt, reading_time')
        .not('slug', 'in', `(${existingSlugs.map((s) => `"${s}"`).join(',')})`)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(3 - data.length);

      return [...data, ...(extra || [])];
    }
  }

  // Fallback: latest 3 posts excluding current
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, featured_image, excerpt, reading_time')
    .neq('slug', currentSlug)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(3);

  if (error) throw error;
  return data || [];
}

async function fetchPopularPosts(currentSlug: string): Promise<PopularPostData[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, featured_image, published_at')
    .neq('slug', currentSlug)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(5);

  if (error) throw error;
  return data || [];
}

async function fetchAllCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('categories')
    .not('published_at', 'is', null);

  if (error) throw error;

  const categorySet = new Set<string>();
  (data || []).forEach((row) => {
    (row.categories || []).forEach((cat: string) => categorySet.add(cat));
  });
  return Array.from(categorySet).sort();
}

export function useBlogPost(slug: string | undefined) {
  const postQuery = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => fetchPostBySlug(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const relatedQuery = useQuery({
    queryKey: ['blog-related', slug, postQuery.data?.categories],
    queryFn: () => fetchRelatedPosts(slug!, postQuery.data?.categories ?? null),
    enabled: !!slug && postQuery.isSuccess,
    staleTime: 5 * 60 * 1000,
  });

  const popularQuery = useQuery({
    queryKey: ['blog-popular', slug],
    queryFn: () => fetchPopularPosts(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['blog-categories'],
    queryFn: fetchAllCategories,
    staleTime: 10 * 60 * 1000,
  });

  return {
    post: postQuery.data ?? null,
    relatedPosts: relatedQuery.data ?? [],
    popularPosts: popularQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    isLoading: postQuery.isLoading,
    isNotFound: postQuery.isSuccess && !postQuery.data,
    error: postQuery.error,
  };
}
