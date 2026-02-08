import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { BlogPopularPost } from './blogTypes';

interface BlogPostSidebarProps {
  categories: string[];
  popularPosts: BlogPopularPost[];
}

export function BlogPostSidebar({ categories, popularPosts }: BlogPostSidebarProps) {
  return (
    <div className="space-y-6 lg:sticky lg:top-6">
      {/* Categories */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link key={cat} to={`/blog?category=${encodeURIComponent(cat)}`}>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-secondary hover:text-secondary-foreground hover:border-secondary transition-colors px-3 py-1 text-xs"
                >
                  {cat}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Popular Posts */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Popular Posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {popularPosts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="flex gap-3 group"
            >
              <img
                src={post.thumbnail}
                alt={post.title}
                className="h-16 w-20 rounded-md object-cover flex-shrink-0"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-secondary transition-colors line-clamp-2 leading-snug">
                  {post.title}
                </p>
                <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(post.date), 'dd MMM yyyy')}
                </span>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
