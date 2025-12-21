import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface LessonEditDialogProps {
  lesson: {
    id: string;
    title: string;
    lesson_type: string;
    video_url: string | null;
    content: string | null;
    duration_seconds: number | null;
    order_index: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LessonEditDialog({ lesson, open, onOpenChange }: LessonEditDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(lesson.title);
  const [lessonType, setLessonType] = useState(lesson.lesson_type);
  const [videoUrl, setVideoUrl] = useState(lesson.video_url || '');
  const [content, setContent] = useState(lesson.content || '');
  const [duration, setDuration] = useState(lesson.duration_seconds?.toString() || '');
  const [orderIndex, setOrderIndex] = useState(lesson.order_index.toString());

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('module_lessons')
        .update({
          title,
          lesson_type: lessonType,
          video_url: videoUrl || null,
          content: content || null,
          duration_seconds: duration ? parseInt(duration) : null,
          order_index: parseInt(orderIndex),
        })
        .eq('id', lesson.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules'] });
      toast.success('Lesson updated');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update lesson');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lesson</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="les-title">Title</Label>
            <Input id="les-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="les-type">Lesson Type</Label>
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
              <Label htmlFor="les-order">Order</Label>
              <Input id="les-order" type="number" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="les-video">Soundslice ID</Label>
              <Input id="les-video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="e.g. lrXCc" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="les-duration">Duration (seconds)</Label>
              <Input id="les-duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="les-content">Content (HTML)</Label>
            <Textarea id="les-content" value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="font-mono text-xs" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
