import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Expert names list
const EXPERTS = [
  'Bombino',
  'Camilo Menjura',
  'Camilo, Fernando & Niwel',
  'Cyro Zuzi',
  'Derek Gripper',
  'Edd Bateman',
  'Felix Ngindu',
  'Fernando Perez',
  'Hamsa Mounif',
  'Jeannot Bel',
  'Justin Adams',
  'La Perla',
  'Leo Power',
  'Malick Mbengue',
  'Matar Ndiongue',
  'Niwel Tsumbu',
  'Rafael Valim',
  'Rubén Ramos Medina',
  'Vieux Farka Toure',
];

interface CourseEditDialogProps {
  course: {
    id: string;
    title: string;
    slug?: string | null;
    description: string | null;
    country: string;
    is_published: boolean;
    tutor_name?: string | null;
    tags?: string[] | null;
    meta_title?: string | null;
    meta_description?: string | null;
    meta_image?: string | null;
  };
  onClose: () => void;
}

export function CourseEditDialog({ course, onClose }: CourseEditDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(course.title);
  const [slug, setSlug] = useState(course.slug || '');
  const [description, setDescription] = useState(course.description || '');
  const [country, setCountry] = useState(course.country);
  const [isPublished, setIsPublished] = useState(course.is_published);
  const [tutorName, setTutorName] = useState(course.tutor_name || '');
  const [tags, setTags] = useState<string[]>(course.tags || []);
  const [newTag, setNewTag] = useState('');
  
  // SEO fields
  const [metaTitle, setMetaTitle] = useState(course.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(course.meta_description || '');
  const [metaImage, setMetaImage] = useState(course.meta_image || '');
  
  const metaDescriptionError = metaDescription.length > 160 
    ? `${metaDescription.length}/160 characters (max 160)` 
    : null;

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Validate meta_description length
      if (metaDescription.length > 160) {
        throw new Error('Meta description must be 160 characters or less');
      }
      
      const { error } = await supabase
        .from('courses')
        .update({
          title,
          slug: slug || null,
          description: description || null,
          country,
          is_published: isPublished,
          tutor_name: tutorName || null,
          tags,
          meta_title: metaTitle || null,
          meta_description: metaDescription || null,
          meta_image: metaImage || null,
        })
        .eq('id', course.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update course');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">URL Slug</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">/courses/</span>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="course-url-slug"
          />
        </div>
        <p className="text-xs text-muted-foreground">The URL path for this course (e.g., peruvian-guitar-styles)</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tutor">Expert / Tutor</Label>
        <Select value={tutorName} onValueChange={setTutorName}>
          <SelectTrigger>
            <SelectValue placeholder="Select an expert" />
          </SelectTrigger>
          <SelectContent>
            {EXPERTS.map((expert) => (
              <SelectItem key={expert} value={expert}>
                {expert}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Course Tags</Label>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add a tag..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <Button type="button" variant="outline" size="icon" onClick={addTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">Used for search filtering, not displayed on course cards</p>
      </div>
      
      <div className="flex items-center justify-between">
        <Label htmlFor="published">Published</Label>
        <Switch
          id="published"
          checked={isPublished}
          onCheckedChange={setIsPublished}
        />
      </div>

      {/* SEO Fields Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-semibold mb-3">SEO Settings</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input
              id="metaTitle"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder={title || 'Enter meta title for SEO'}
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              {metaTitle.length}/60 characters. Defaults to course title if empty.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea
              id="metaDescription"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder={description?.substring(0, 160) || 'Enter meta description for SEO'}
              rows={2}
              maxLength={160}
              className={metaDescriptionError ? 'border-destructive' : ''}
            />
            <p className={`text-xs ${metaDescriptionError ? 'text-destructive' : 'text-muted-foreground'}`}>
              {metaDescriptionError || `${metaDescription.length}/160 characters. Defaults to course description if empty.`}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="metaImage">Meta Image URL</Label>
            <Input
              id="metaImage"
              value={metaImage}
              onChange={(e) => setMetaImage(e.target.value)}
              placeholder="https://example.com/og-image.jpg"
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Open Graph image for social sharing. Defaults to course cover image if empty.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={updateMutation.isPending || !!metaDescriptionError}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
