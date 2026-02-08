import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FileUpload } from '@/components/ui/file-upload';
import { useR2Upload } from '@/hooks/useR2Upload';
import { Loader2, X } from 'lucide-react';
import type { BlogPostRow } from './types';

export interface BlogPostFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string;
  author_name: string;
  published_at: string;
  categories: string[];
  is_published: boolean;
  meta_title: string;
  meta_description: string;
}

const emptyForm: BlogPostFormData = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  featured_image: '',
  author_name: '',
  published_at: new Date().toISOString().slice(0, 16),
  categories: [],
  is_published: false,
  meta_title: '',
  meta_description: '',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function estimateReadTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, '');
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

interface BlogPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: BlogPostRow | null;
  onSave: (data: BlogPostFormData & { reading_time: number }) => void;
  isSaving: boolean;
}

export function BlogPostDialog({ open, onOpenChange, post, onSave, isSaving }: BlogPostDialogProps) {
  const [form, setForm] = useState<BlogPostFormData>(emptyForm);
  const [categoryInput, setCategoryInput] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const { uploadFile, isUploading, progress } = useR2Upload();

  useEffect(() => {
    if (post) {
      setForm({
        title: post.title,
        slug: post.slug,
        content: post.content || '',
        excerpt: post.excerpt || '',
        featured_image: post.featured_image || '',
        author_name: post.author_name || '',
        published_at: post.published_at
          ? new Date(post.published_at).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        categories: post.categories || [],
        is_published: !!post.published_at,
        meta_title: post.meta_title || '',
        meta_description: post.meta_description || '',
      });
      setSlugTouched(true);
    } else {
      setForm(emptyForm);
      setSlugTouched(false);
    }
    setCategoryInput('');
  }, [post, open]);

  const updateField = useCallback(<K extends keyof BlogPostFormData>(key: K, value: BlogPostFormData[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'title' && !slugTouched) {
        next.slug = slugify(value as string);
      }
      if (key === 'content' && !prev.excerpt) {
        const text = (value as string).replace(/<[^>]*>/g, '');
        next.excerpt = text.slice(0, 150).trim();
      }
      return next;
    });
  }, [slugTouched]);

  const addCategory = useCallback(() => {
    const trimmed = categoryInput.trim();
    if (trimmed && !form.categories.includes(trimmed)) {
      setForm(prev => ({ ...prev, categories: [...prev.categories, trimmed] }));
    }
    setCategoryInput('');
  }, [categoryInput, form.categories]);

  const removeCategory = useCallback((cat: string) => {
    setForm(prev => ({ ...prev, categories: prev.categories.filter(c => c !== cat) }));
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    const result = await uploadFile(file, {
      bucket: 'admin',
      folder: 'blog-images',
      imageOptimization: 'feed',
    });
    if (result?.url) {
      setForm(prev => ({ ...prev, featured_image: result.url }));
    }
  }, [uploadFile]);

  const handleSubmit = () => {
    if (!form.title.trim() || !form.slug.trim()) return;
    onSave({
      ...form,
      published_at: form.is_published ? new Date(form.published_at).toISOString() : '',
      reading_time: estimateReadTime(form.content),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? 'Edit Blog Post' : 'New Blog Post'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Title */}
          <div>
            <Label htmlFor="bp-title">Title *</Label>
            <Input
              id="bp-title"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder="Enter blog post title"
            />
          </div>

          {/* Slug */}
          <div>
            <Label htmlFor="bp-slug">Slug *</Label>
            <Input
              id="bp-slug"
              value={form.slug}
              onChange={e => { setSlugTouched(true); updateField('slug', slugify(e.target.value)); }}
              placeholder="auto-generated-from-title"
            />
          </div>

          {/* Featured Image */}
          <div>
            <Label>Featured Image</Label>
            {form.featured_image ? (
              <div className="relative mt-1 rounded-xl overflow-hidden border border-border">
                <img src={form.featured_image} alt="Featured" className="w-full h-48 object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => setForm(prev => ({ ...prev, featured_image: '' }))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <FileUpload
                onFileSelect={handleImageUpload}
                accept="image/*"
                maxSizeMB={10}
                isUploading={isUploading}
                progress={progress}
                className="mt-1"
              />
            )}
          </div>

          {/* Author + Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bp-author">Author</Label>
              <Input
                id="bp-author"
                value={form.author_name}
                onChange={e => updateField('author_name', e.target.value)}
                placeholder="Author name"
              />
            </div>
            <div>
              <Label htmlFor="bp-date">Published Date</Label>
              <Input
                id="bp-date"
                type="datetime-local"
                value={form.published_at}
                onChange={e => updateField('published_at', e.target.value)}
              />
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_published}
              onCheckedChange={v => updateField('is_published', v)}
            />
            <Label className="mb-0">
              {form.is_published ? 'Published' : 'Draft'}
            </Label>
          </div>

          {/* Categories */}
          <div>
            <Label>Categories</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={categoryInput}
                onChange={e => setCategoryInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
                placeholder="Type & press Enter"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addCategory}>Add</Button>
            </div>
            {form.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.categories.map(cat => (
                  <Badge key={cat} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeCategory(cat)}>
                    {cat}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="bp-content">Content (HTML)</Label>
            <Textarea
              id="bp-content"
              value={form.content}
              onChange={e => updateField('content', e.target.value)}
              placeholder="<p>Write your blog post content here…</p>"
              className="min-h-[200px] font-mono text-xs"
              rows={12}
            />
          </div>

          {/* Excerpt */}
          <div>
            <Label htmlFor="bp-excerpt">Excerpt</Label>
            <Textarea
              id="bp-excerpt"
              value={form.excerpt}
              onChange={e => updateField('excerpt', e.target.value)}
              placeholder="Short summary (auto-generated if left blank)"
              rows={3}
            />
          </div>

          {/* SEO */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="bp-meta-title">Meta Title</Label>
              <Input
                id="bp-meta-title"
                value={form.meta_title}
                onChange={e => updateField('meta_title', e.target.value)}
                placeholder="SEO title (defaults to post title)"
              />
            </div>
            <div>
              <Label htmlFor="bp-meta-desc">Meta Description</Label>
              <Textarea
                id="bp-meta-desc"
                value={form.meta_description}
                onChange={e => updateField('meta_description', e.target.value)}
                placeholder="SEO description"
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !form.title.trim() || !form.slug.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {post ? 'Update Post' : 'Create Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
