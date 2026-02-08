import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Edit, Trash2, ExternalLink, Search, FileText, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { BlogPostDialog, type BlogPostFormData } from './BlogPostDialog';
import { BlogTrashBin } from './BlogTrashBin';
import type { BlogPostRow } from './types';

type StatusFilter = 'all' | 'published' | 'draft';

export function AdminBlog() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPostRow | null>(null);
  const [deletingPost, setDeletingPost] = useState<BlogPostRow | null>(null);
  const [permanentDeletePost, setPermanentDeletePost] = useState<BlogPostRow | null>(null);

  // ── Fetch all posts (including trashed) ──
  const { data: allPosts = [], isLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BlogPostRow[];
    },
  });

  // Separate active vs trashed
  const posts = useMemo(() => allPosts.filter(p => !p.deleted_at), [allPosts]);
  const trashedPosts = useMemo(() => allPosts.filter(p => !!p.deleted_at), [allPosts]);

  // ── Derive all categories ──
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach(p => p.categories?.forEach(c => set.add(c)));
    return Array.from(set).sort();
  }, [posts]);

  // ── Filter logic ──
  const filtered = useMemo(() => {
    return posts.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && p.published_at) ||
        (statusFilter === 'draft' && !p.published_at);
      const matchCat = categoryFilter === 'all' || (p.categories || []).includes(categoryFilter);
      return matchSearch && matchStatus && matchCat;
    });
  }, [posts, search, statusFilter, categoryFilter]);

  // ── Upsert mutation ──
  const saveMutation = useMutation({
    mutationFn: async (data: BlogPostFormData & { reading_time: number } & { id?: string }) => {
      const row = {
        title: data.title,
        slug: data.slug,
        content: data.content || null,
        excerpt: data.excerpt || null,
        featured_image: data.featured_image || null,
        author_name: data.author_name || null,
        published_at: data.is_published && data.published_at ? data.published_at : null,
        categories: data.categories.length > 0 ? data.categories : null,
        tags: data.tags.length > 0 ? data.tags : null,
        reading_time: data.reading_time,
        meta_title: data.meta_title || null,
        meta_description: data.meta_description || null,
      };

      if (data.id) {
        const { error } = await supabase.from('blog_posts').update(row).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('blog_posts').insert({ ...row, slug: data.slug });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      setDialogOpen(false);
      setEditingPost(null);
      toast.success(editingPost ? 'Post updated' : 'Post created');
    },
    onError: (err: Error) => {
      toast.error(err.message?.includes('duplicate') ? 'Slug already exists' : err.message);
    },
  });

  // ── Soft delete (move to trash) ──
  const softDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blog_posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      setDeletingPost(null);
      toast.success('Post moved to bin');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Permanent delete ──
  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      setPermanentDeletePost(null);
      toast.success('Post permanently deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = (data: BlogPostFormData & { reading_time: number }) => {
    saveMutation.mutate({ ...data, id: editingPost?.id });
  };

  const openNew = () => { setEditingPost(null); setDialogOpen(true); };
  const openEdit = (p: BlogPostRow) => { setEditingPost(p); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      {/* ── Header Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Blog Posts
          <Badge variant="outline" className="ml-1">{posts.length}</Badge>
        </h2>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          New Blog
        </Button>
      </div>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="bin" className="gap-1.5">
            <Trash className="h-3.5 w-3.5" />
            Bin
            {trashedPosts.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-xs">
                {trashedPosts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4 mt-4">
          {/* ── Filters ── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title or slug…"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Loading ── */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {posts.length === 0 ? 'No blog posts yet. Click "New Blog" to create one.' : 'No posts match your filters.'}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ── Desktop Table ── */}
              <div className="hidden md:block border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Image</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(post => (
                      <TableRow key={post.id}>
                        <TableCell>
                          {post.featured_image ? (
                            <img src={post.featured_image} alt="" className="h-10 w-14 rounded object-cover" />
                          ) : (
                            <div className="h-10 w-14 rounded bg-muted flex items-center justify-center">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{post.title}</TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[140px] truncate">{post.slug}</TableCell>
                        <TableCell className="text-sm">{post.author_name || '—'}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {post.published_at ? format(new Date(post.published_at), 'dd MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {(post.categories || []).slice(0, 3).map(c => (
                              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                            ))}
                            {(post.categories || []).length > 3 && (
                              <Badge variant="outline" className="text-xs">+{post.categories!.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={post.published_at ? 'success' : 'secondary'}>
                            {post.published_at ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(post)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeletingPost(post)} title="Move to bin">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            {post.published_at && (
                              <Button variant="ghost" size="icon" asChild title="View Live">
                                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ── Mobile Cards ── */}
              <div className="md:hidden space-y-3">
                {filtered.map(post => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {post.featured_image ? (
                          <img src={post.featured_image} alt="" className="h-16 w-20 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-16 w-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{post.title}</h3>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">/{post.slug}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant={post.published_at ? 'success' : 'secondary'} className="text-xs">
                              {post.published_at ? 'Published' : 'Draft'}
                            </Badge>
                            {post.published_at && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(post.published_at), 'dd MMM yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(post)}>
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDeletingPost(post)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                        {post.published_at && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="bin" className="mt-4">
          <BlogTrashBin trashedPosts={trashedPosts} />
        </TabsContent>
      </Tabs>

      {/* ── Create / Edit Dialog ── */}
      <BlogPostDialog
        open={dialogOpen}
        onOpenChange={open => { setDialogOpen(open); if (!open) setEditingPost(null); }}
        post={editingPost}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
      />

      {/* ── Soft Delete (Move to Bin) Confirmation ── */}
      <AlertDialog open={!!deletingPost} onOpenChange={open => { if (!open) setDeletingPost(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move "{deletingPost?.title}" to bin?</AlertDialogTitle>
            <AlertDialogDescription>
              This post will be moved to the bin and automatically deleted after 15 days. You can restore it anytime before then.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingPost && softDeleteMutation.mutate(deletingPost.id)}
            >
              {softDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Move to Bin'}
            </AlertDialogAction>
            <AlertDialogAction
              className="border border-destructive bg-transparent text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (deletingPost) {
                  setPermanentDeletePost(deletingPost);
                  setDeletingPost(null);
                }
              }}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Permanent Delete Confirmation ── */}
      <AlertDialog open={!!permanentDeletePost} onOpenChange={open => { if (!open) setPermanentDeletePost(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete "{permanentDeletePost?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The post will be permanently removed and will NOT go to the bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => permanentDeletePost && permanentDeleteMutation.mutate(permanentDeletePost.id)}
            >
              {permanentDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
