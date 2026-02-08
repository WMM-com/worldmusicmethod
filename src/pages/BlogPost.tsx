import { useParams } from 'react-router-dom';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BlogPostHero } from '@/components/blog/BlogPostHero';
import { BlogPostMeta } from '@/components/blog/BlogPostMeta';
import { BlogPostContent } from '@/components/blog/BlogPostContent';
import { BlogPostSidebar } from '@/components/blog/BlogPostSidebar';
import { BlogRelatedPosts } from '@/components/blog/BlogRelatedPosts';
import { BlogCTASection } from '@/components/blog/BlogCTASection';
import { Helmet } from 'react-helmet-async';
import { PLACEHOLDER_POST, PLACEHOLDER_RELATED, PLACEHOLDER_POPULAR, PLACEHOLDER_CATEGORIES } from '@/components/blog/blogPlaceholderData';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  // TODO: Replace with real data fetching by slug
  const post = PLACEHOLDER_POST;
  const relatedPosts = PLACEHOLDER_RELATED;
  const popularPosts = PLACEHOLDER_POPULAR;
  const categories = PLACEHOLDER_CATEGORIES;

  return (
    <>
      <Helmet>
        <title>{post.title} | World Music Method</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={post.heroImage} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
        <SiteHeader />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Hero */}
          <BlogPostHero title={post.title} heroImage={post.heroImage} />

          {/* Metadata row */}
          <BlogPostMeta
            author={post.author}
            date={post.date}
            readTime={post.readTime}
            slug={slug || ''}
            title={post.title}
          />

          {/* Two-column layout */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Main content */}
              <div className="lg:col-span-2">
                <BlogPostContent content={post.content} />
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-1">
                <BlogPostSidebar
                  categories={categories}
                  popularPosts={popularPosts}
                />
              </aside>
            </div>
          </div>

          {/* Related Posts */}
          <BlogRelatedPosts posts={relatedPosts} />

          {/* CTA Section */}
          <BlogCTASection />
        </main>
      </div>
    </>
  );
}
