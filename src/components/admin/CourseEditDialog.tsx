import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface CourseEditDialogProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    country: string;
    is_published: boolean;
  };
  onClose: () => void;
}

export function CourseEditDialog({ course, onClose }: CourseEditDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || '');
  const [country, setCountry] = useState(course.country);
  const [isPublished, setIsPublished] = useState(course.is_published);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('courses')
        .update({
          title,
          description: description || null,
          country,
          is_published: isPublished,
        })
        .eq('id', course.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
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
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          required
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="published">Published</Label>
        <Switch
          id="published"
          checked={isPublished}
          onCheckedChange={setIsPublished}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
