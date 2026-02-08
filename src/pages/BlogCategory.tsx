import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, ArrowLeft, ArrowUpRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import wmmLogo from '@/assets/wmm-logo.png';

const FALLBACK_IMAGE = wmmLogo;

interface CategoryPost {
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string | null;
  reading_time: number | null;
  categories: string[] | null;
}

function formatCategoryName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function fetchPostsByCategory(categorySlug: string): Promise<CategoryPost[]> {
  const categoryName = formatCategoryName(categorySlug);

  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, featured_image, published_at, reading_time, categories')
    .not('published_at', 'is', null)
    .is('deleted_at', null)
    .overlaps('categories', [categoryName])
    .order('published_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

function CategoryPageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-[360px] w-full rounded-2xl" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ categoryName }: { categoryName: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <FileText className="h-16 w-16 text-muted-foreground/40 mb-6" />
      <h2 className="text-2xl font-display text-foreground mb-2">No posts yet</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        There are no posts in the "{categoryName}" category right now. Check back soon!
      </p>
      <Button asChild variant="secondary">
        <Link to="/blog" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>
      </Button>
    </div>
  );
}

export default function BlogCategory() {
  const { slug } = useParams<{ slug: string }>();
  const categoryName = formatCategoryName(slug || '');

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['blog-category-posts', slug],
    queryFn: () => fetchPostsByCategory(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const featuredPost = posts?.[0] ?? null;
  const otherPosts = posts?.slice(1) ?? [];

  return (
    <>
      <Helmet>
        <title>{categoryName} | Blog | World Music Method</title>
        <meta name="description" content={`Browse all blog posts in the ${categoryName} category.`} />
      </Helmet>

      <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
        <SiteHeader />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            {/* Header */}
            <p className="text-sm text-muted-foreground mb-1">Showing posts for</p>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-10">
              {categoryName}
            </h1>

            {isLoading && <CategoryPageSkeleton />}

            {!isLoading && (!posts || posts.length === 0) && (
              <EmptyState categoryName={categoryName} />
            )}

            {!isLoading && posts && posts.length > 0 && (
              <div className="space-y-8">
                {/* Featured Post Card */}
                {featuredPost && (
                  <Link
                    to={`/blog/${featuredPost.slug}`}
                    className="block group"
                  >
                    <div className="relative rounded-2xl overflow-hidden bg-secondary/15 border border-secondary/20 transition-all duration-300 hover:border-secondary/40 hover:shadow-lg hover:shadow-secondary/5">
                      {/* Arrow icon top-right */}
                      <div className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/40 transition-colors">
                        <ArrowUpRight className="h-5 w-5 text-secondary" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                        {/* Image */}
                        <div className="aspect-[4/3] md:aspect-auto md:min-h-[320px] overflow-hidden">
                          <img
                            src={featuredPost.featured_image || FALLBACK_IMAGE}
                            alt={featuredPost.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>

                        {/* Content */}
                        <div className="p-6 sm:p-8 flex flex-col justify-center">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-xs font-medium uppercase tracking-wider text-secondary">
                              Category
                            </span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                              {categoryName}
                            </span>
                          </div>

                          <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground leading-tight mb-4 group-hover:text-secondary transition-colors">
                            {featuredPost.title}
                          </h2>

                          {featuredPost.excerpt && (
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-5">
                              {featuredPost.excerpt}
                            </p>
                          )}

                          <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary group-hover:gap-2 transition-all">
                            More
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Divider */}
                {otherPosts.length > 0 && (
                  <div className="border-t border-border" />
                )}

                {/* List of remaining posts */}
                {otherPosts.length > 0 && (
                  <div className="divide-y divide-border">
                    {otherPosts.map((post) => (
                      <Link
                        key={post.slug}
                        to={`/blog/${post.slug}`}
                        className="flex items-center justify-between gap-4 py-5 group"
                      >
                        <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-secondary transition-colors line-clamp-1 uppercase tracking-wide">
                          {post.title}
                        </h3>
                        <ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-secondary group-hover:translate-x-1 transition-all" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
