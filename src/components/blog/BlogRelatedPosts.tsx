import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import type { BlogRelatedPost } from './blogTypes';

interface BlogRelatedPostsProps {
  posts: BlogRelatedPost[];
}

export function BlogRelatedPosts({ posts }: BlogRelatedPostsProps) {
  if (!posts.length) return null;

  return (
    <section className="border-t border-border bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <h2 className="text-2xl sm:text-3xl font-display text-foreground mb-8">
          Related News
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="group">
              <Card className="overflow-hidden border-border bg-card hover:border-secondary/40 transition-all duration-300 h-full">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <CardContent className="p-5">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-secondary transition-colors line-clamp-2 mb-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {post.excerpt}
                  </p>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {post.readTime}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
