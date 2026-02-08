import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Helmet } from 'react-helmet-async';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { Search, Clock, ArrowUpRight, Calendar, Tag, LayoutGrid, FileText } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import wmmLogo from '@/assets/wmm-logo.png';

const FALLBACK_IMAGE = wmmLogo;
const POSTS_PER_PAGE = 9;

// ─── Types ───────────────────────────────────────────
interface BlogListPost {
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string | null;
  reading_time: number | null;
  categories: string[] | null;
  tags: string[] | null;
}

// ─── Data fetching ───────────────────────────────────
async function fetchAllPublishedPosts(): Promise<BlogListPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, featured_image, published_at, reading_time, categories, tags')
    .not('published_at', 'is', null)
    .is('deleted_at', null)
    .order('published_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ─── Helpers ─────────────────────────────────────────
function getAllUniqueValues(posts: BlogListPost[], field: 'categories' | 'tags'): string[] {
  const set = new Set<string>();
  posts.forEach((p) => (p[field] || []).forEach((v) => set.add(v)));
  return Array.from(set).sort();
}

function getDateFilterOptions() {
  const now = new Date();
  const currentYear = now.getFullYear();
  return [
    { value: 'all', label: 'All Time' },
    { value: 'this-year', label: `This Year (${currentYear})` },
    { value: 'last-year', label: `Last Year (${currentYear - 1})` },
    { value: 'last-30', label: 'Last 30 Days' },
    { value: 'last-90', label: 'Last 90 Days' },
  ];
}

function filterByDate(post: BlogListPost, dateFilter: string): boolean {
  if (dateFilter === 'all' || !post.published_at) return true;
  const pubDate = parseISO(post.published_at);
  const now = new Date();

  switch (dateFilter) {
    case 'this-year':
      return pubDate.getFullYear() === now.getFullYear();
    case 'last-year':
      return pubDate.getFullYear() === now.getFullYear() - 1;
    case 'last-30': {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return isAfter(pubDate, startOfDay(d));
    }
    case 'last-90': {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      return isAfter(pubDate, startOfDay(d));
    }
    default:
      return true;
  }
}

function getPaginationRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('ellipsis', total);
  } else if (current >= total - 3) {
    pages.push(1, 'ellipsis');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total);
  }
  return pages;
}

// ─── Skeleton ────────────────────────────────────────
function BlogPageSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <FileText className="h-16 w-16 text-muted-foreground/40 mb-6" />
      <h2 className="text-2xl font-display text-foreground mb-2">No posts found</h2>
      <p className="text-muted-foreground max-w-md">
        Try adjusting your search or filters to find what you're looking for.
      </p>
    </div>
  );
}

// ─── Post Card ───────────────────────────────────────
function BlogCard({ post, featured = false }: { post: BlogListPost; featured?: boolean }) {
  const readTime = post.reading_time ? `${post.reading_time} min read` : '5 min read';
  const pubDate = post.published_at ? format(parseISO(post.published_at), 'MMM d, yyyy') : '';

  if (featured) {
    return (
      <Link to={`/blog/${post.slug}`} className="block group col-span-full">
        <Card className="relative overflow-hidden border-border bg-card hover:border-secondary/40 transition-all duration-300">
          <div className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/40 transition-colors">
            <ArrowUpRight className="h-5 w-5 text-secondary" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[360px] overflow-hidden">
              <img
                src={post.featured_image || FALLBACK_IMAGE}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="eager"
              />
            </div>
            <CardContent className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
              {post.categories && post.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.categories.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="text-xs font-medium uppercase tracking-wider text-secondary bg-secondary/10 px-2.5 py-1 rounded-full"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-display text-foreground leading-tight mb-3 group-hover:text-secondary transition-colors">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-5">
                  {post.excerpt}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {pubDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {pubDate}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {readTime}
                </span>
              </div>
            </CardContent>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link to={`/blog/${post.slug}`} className="block group h-full">
      <Card className="relative overflow-hidden border-border bg-card hover:border-secondary/40 transition-all duration-300 h-full flex flex-col">
        <div className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="h-4 w-4 text-secondary" />
        </div>
        <div className="relative aspect-video overflow-hidden">
          <img
            src={post.featured_image || FALLBACK_IMAGE}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
        <CardContent className="p-5 flex flex-col flex-1">
          {post.categories && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.categories.slice(0, 2).map((cat) => (
                <span
                  key={cat}
                  className="text-[10px] font-medium uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-0.5 rounded-full"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
          <h3 className="text-base font-semibold text-foreground group-hover:text-secondary transition-colors line-clamp-2 mb-2 flex-grow-0">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
              {post.excerpt}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-3 border-t border-border/50">
            {pubDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {pubDate}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {readTime}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Main Page ───────────────────────────────────────
export default function Blog() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-all-posts'],
    queryFn: fetchAllPublishedPosts,
    staleTime: 5 * 60 * 1000,
  });

  const allCategories = useMemo(() => getAllUniqueValues(posts || [], 'categories'), [posts]);
  const allTags = useMemo(() => getAllUniqueValues(posts || [], 'tags'), [posts]);
  const dateOptions = useMemo(() => getDateFilterOptions(), []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, tagFilter, dateFilter]);

  // Filter posts
  const filtered = useMemo(() => {
    if (!posts) return [];
    return posts.filter((p) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchExcerpt = (p.excerpt || '').toLowerCase().includes(q);
        const matchTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchExcerpt && !matchTags) return false;
      }
      // Category
      if (categoryFilter !== 'all') {
        if (!(p.categories || []).includes(categoryFilter)) return false;
      }
      // Tag
      if (tagFilter !== 'all') {
        if (!(p.tags || []).includes(tagFilter)) return false;
      }
      // Date
      if (!filterByDate(p, dateFilter)) return false;
      return true;
    });
  }, [posts, search, categoryFilter, tagFilter, dateFilter]);

  const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE);
  const paginatedPosts = filtered.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);
  const paginationRange = getPaginationRange(page, totalPages);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = search || categoryFilter !== 'all' || tagFilter !== 'all' || dateFilter !== 'all';

  return (
    <>
      <Helmet>
        <title>Blog | World Music Method</title>
        <meta name="description" content="Explore our latest articles, insights, and stories about world music, education, and creative culture." />
      </Helmet>

      <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
        <SiteHeader />

        <main ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Hero / Header */}
          <div className="border-b border-border bg-card/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display text-foreground mb-2">
                Blog
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
                Insights, stories, and updates from the world of music education and creative culture.
              </p>
            </div>
          </div>

          {/* Filters bar */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search posts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filter selects */}
                <div className="flex flex-wrap gap-2">
                  {/* Category */}
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]">
                      <LayoutGrid className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {allCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Tags */}
                  {allTags.length > 0 && (
                    <Select value={tagFilter} onValueChange={setTagFilter}>
                      <SelectTrigger className="w-[140px]">
                        <Tag className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="Tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {allTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Date */}
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[170px]">
                      <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Date" />
                    </SelectTrigger>
                    <SelectContent>
                      {dateOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Clear filters */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearch('');
                        setCategoryFilter('all');
                        setTagFilter('all');
                        setDateFilter('all');
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              </div>

              {/* Active filter summary */}
              {!isLoading && (
                <p className="text-xs text-muted-foreground mt-2">
                  {filtered.length} {filtered.length === 1 ? 'post' : 'posts'} found
                  {hasActiveFilters ? ' with current filters' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            {isLoading ? (
              <BlogPageSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {/* Cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedPosts.map((post, idx) => (
                    <BlogCard
                      key={post.slug}
                      post={post}
                      featured={page === 1 && idx === 0 && !hasActiveFilters}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 sm:mt-14">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => page > 1 && handlePageChange(page - 1)}
                            className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {paginationRange.map((p, idx) =>
                          p === 'ellipsis' ? (
                            <PaginationItem key={`e-${idx}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={p}>
                              <PaginationLink
                                isActive={p === page}
                                onClick={() => handlePageChange(p as number)}
                                className="cursor-pointer"
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        )}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => page < totalPages && handlePageChange(page + 1)}
                            className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
