import { useParams, Link } from 'react-router-dom';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BlogPostHero } from '@/components/blog/BlogPostHero';
import { BlogPostMeta } from '@/components/blog/BlogPostMeta';
import { BlogPostContent } from '@/components/blog/BlogPostContent';
import { BlogPostSidebar } from '@/components/blog/BlogPostSidebar';
import { BlogRelatedPosts } from '@/components/blog/BlogRelatedPosts';
import { BlogCTASection } from '@/components/blog/BlogCTASection';
import { BlogPostSkeleton } from '@/components/blog/BlogPostSkeleton';
import { Helmet } from 'react-helmet-async';
import { useBlogPost } from '@/hooks/useBlogPost';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import wmmLogo from '@/assets/wmm-logo.png';

const FALLBACK_IMAGE = wmmLogo;

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { post, relatedPosts, popularPosts, categories, isLoading, isNotFound } = useBlogPost(slug);

  // Loading state
  if (isLoading) {
    return (
      <>
        <SiteHeader />
        <BlogPostSkeleton />
      </>
    );
  }

  // 404 state
  if (isNotFound || !post) {
    return (
      <>
        <SiteHeader />
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-background px-4 text-center">
          <h1 className="text-6xl font-display text-foreground mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Sorry, this blog post could not be found.
          </p>
          <Button asChild variant="secondary">
            <Link to="/blog" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </>
    );
  }

  const heroImage = post.featured_image || FALLBACK_IMAGE;
  const readTime = post.reading_time ? `${post.reading_time} min read` : '5 min read';
  const excerpt = post.excerpt || post.meta_description || '';
  const metaTitle = post.meta_title || post.title;
  const metaDescription = post.meta_description || excerpt;

  // Map related posts to the shape BlogRelatedPosts expects
  const mappedRelated = relatedPosts.map((rp) => ({
    title: rp.title,
    slug: rp.slug,
    image: rp.featured_image || FALLBACK_IMAGE,
    excerpt: rp.excerpt || '',
    readTime: rp.reading_time ? `${rp.reading_time} min read` : '5 min read',
  }));

  // Map popular posts for sidebar
  const mappedPopular = popularPosts.map((pp) => ({
    title: pp.title,
    slug: pp.slug,
    thumbnail: pp.featured_image || FALLBACK_IMAGE,
    date: pp.published_at || new Date().toISOString(),
  }));

  return (
    <>
      <Helmet>
        <title>{metaTitle} | World Music Method</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
        <SiteHeader />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Hero */}
          <BlogPostHero title={post.title} heroImage={heroImage} />

          {/* Metadata row */}
          <BlogPostMeta
            author={{ name: post.author_name || 'World Music Method', avatar: '' }}
            date={post.published_at || new Date().toISOString()}
            readTime={readTime}
            slug={slug || ''}
            title={post.title}
          />

          {/* Two-column layout */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Main content */}
              <div className="lg:col-span-2">
                <BlogPostContent content={post.content || ''} />
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-1">
                <BlogPostSidebar
                  categories={categories}
                  popularPosts={mappedPopular}
                  tags={post.tags || []}
                />
              </aside>
            </div>
          </div>

          {/* Related Posts */}
          <BlogRelatedPosts posts={mappedRelated} />

          {/* CTA Section */}
          <BlogCTASection />
        </main>
      </div>
    </>
  );
}
