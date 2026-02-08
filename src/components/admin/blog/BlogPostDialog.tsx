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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/ui/file-upload';
import { useR2Upload } from '@/hooks/useR2Upload';
import { BlogRichTextEditor } from './BlogRichTextEditor';
import { Loader2, X } from 'lucide-react';
import type { BlogPostRow } from './types';

export interface BlogPostFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string;
  featured_image_size: string;
  featured_image_position: string;
  author_name: string;
  published_at: string;
  categories: string[];
  tags: string[];
  is_published: boolean;
  meta_title: string;
  meta_description: string;
}

const IMAGE_SIZES = [
  { value: 'small', label: 'Small', desc: '400px max height' },
  { value: 'medium', label: 'Medium', desc: '500px max height' },
  { value: 'large', label: 'Large', desc: '600px max height' },
  { value: 'full', label: 'Full Size', desc: 'Original dimensions' },
] as const;

const IMAGE_POSITIONS = [
  { value: 'top left', label: 'Top Left' },
  { value: 'top center', label: 'Top Center' },
  { value: 'top right', label: 'Top Right' },
  { value: 'center left', label: 'Center Left' },
  { value: 'center center', label: 'Center' },
  { value: 'center right', label: 'Center Right' },
  { value: 'bottom left', label: 'Bottom Left' },
  { value: 'bottom center', label: 'Bottom Center' },
  { value: 'bottom right', label: 'Bottom Right' },
] as const;

const emptyForm: BlogPostFormData = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  featured_image: '',
  featured_image_size: 'full',
  featured_image_position: 'center center',
  author_name: '',
  published_at: new Date().toISOString().slice(0, 16),
  categories: [],
  tags: [],
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
  const [tagInput, setTagInput] = useState('');
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
        featured_image_size: post.featured_image_size || 'full',
        featured_image_position: post.featured_image_position || 'center center',
        author_name: post.author_name || '',
        published_at: post.published_at
          ? new Date(post.published_at).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        categories: post.categories || [],
        tags: post.tags || [],
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
    setTagInput('');
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

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !form.tags.includes(trimmed) && form.tags.length < 10) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
    }
    setTagInput('');
  }, [tagInput, form.tags]);

  const removeTag = useCallback((tag: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
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
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
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
              <>
                {/* Live preview with size & position applied */}
                <div
                  className="relative mt-1 rounded-xl overflow-hidden border border-border transition-all duration-300"
                  style={{
                    height: form.featured_image_size === 'small' ? '150px'
                      : form.featured_image_size === 'medium' ? '200px'
                      : form.featured_image_size === 'large' ? '250px'
                      : '200px',
                  }}
                >
                  <img
                    src={form.featured_image}
                    alt="Featured"
                    className="w-full h-full object-cover transition-all duration-300"
                    style={{ objectPosition: form.featured_image_position }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => setForm(prev => ({ ...prev, featured_image: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {/* Size & position badge overlay */}
                  <div className="absolute bottom-2 left-2 flex gap-1.5">
                    <span className="text-[10px] bg-background/80 backdrop-blur-sm text-foreground px-2 py-0.5 rounded-md border border-border">
                      {IMAGE_SIZES.find(s => s.value === form.featured_image_size)?.label || 'Full Size'}
                    </span>
                    <span className="text-[10px] bg-background/80 backdrop-blur-sm text-foreground px-2 py-0.5 rounded-md border border-border">
                      {IMAGE_POSITIONS.find(p => p.value === form.featured_image_position)?.label || 'Center'}
                    </span>
                  </div>
                </div>

                {/* Dropdowns row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Image Size</Label>
                    <Select
                      value={form.featured_image_size}
                      onValueChange={v => updateField('featured_image_size', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_SIZES.map(s => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label} — {s.desc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Image Position</Label>
                    <Select
                      value={form.featured_image_position}
                      onValueChange={v => updateField('featured_image_position', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_POSITIONS.map(p => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
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

          {/* Tags */}
          <div>
            <Label>Tags <span className="text-muted-foreground text-xs font-normal">(max 10)</span></Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Type & press Enter"
                className="flex-1"
                disabled={form.tags.length >= 10}
              />
              <Button type="button" variant="outline" onClick={addTag} disabled={form.tags.length >= 10}>Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="gap-1 cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Content - Full Rich Text Editor */}
          <div>
            <Label>Content</Label>
            <div className="mt-1">
              <BlogRichTextEditor
                value={form.content}
                onChange={val => updateField('content', val)}
              />
            </div>
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
