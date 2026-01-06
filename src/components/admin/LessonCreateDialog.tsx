import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface LessonCreateDialogProps {
  moduleId: string;
  courseId: string;
  nextOrderIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LessonCreateDialog({ moduleId, courseId, nextOrderIndex, open, onOpenChange }: LessonCreateDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [lessonType, setLessonType] = useState('video');
  const [videoUrl, setVideoUrl] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('module_lessons')
        .insert({
          module_id: moduleId,
          title,
          lesson_type: lessonType,
          video_url: videoUrl || null,
          order_index: nextOrderIndex,
          soundslice_preset: 'guitar',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] });
      toast.success('Lesson created');
      setTitle('');
      setLessonType('video');
      setVideoUrl('');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create lesson');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Lesson</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-les-title">Title *</Label>
            <Input 
              id="new-les-title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g. Basic Rhythm Pattern"
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-les-type">Lesson Type</Label>
            <Select value={lessonType} onValueChange={setLessonType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="listening">Listening</SelectItem>
                <SelectItem value="assignment">Assignment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-les-video">Soundslice ID (optional)</Label>
            <Input 
              id="new-les-video" 
              value={videoUrl} 
              onChange={(e) => setVideoUrl(e.target.value)} 
              placeholder="e.g. lrXCc"
            />
            <p className="text-xs text-muted-foreground">Just the 5-digit code, not the full URL</p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || !title.trim()}>
              {createMutation.isPending ? 'Creating...' : 'Create Lesson'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
