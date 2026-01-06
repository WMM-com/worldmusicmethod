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
import { toast } from 'sonner';

interface ModuleCreateDialogProps {
  courseId: string;
  nextOrderIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModuleCreateDialog({ courseId, nextOrderIndex, open, onOpenChange }: ModuleCreateDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [regionName, setRegionName] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('course_modules')
        .insert({
          course_id: courseId,
          title,
          description: description || null,
          region_name: regionName || null,
          order_index: nextOrderIndex,
          color_theme: 'earth',
          icon_type: 'mountain',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] });
      queryClient.invalidateQueries({ queryKey: ['admin-module-counts'] });
      toast.success('Module created');
      setTitle('');
      setDescription('');
      setRegionName('');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create module');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Module</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-mod-title">Title *</Label>
            <Input 
              id="new-mod-title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g. Introduction to Huayño"
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-mod-desc">Description</Label>
            <Textarea 
              id="new-mod-desc" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={3}
              placeholder="Brief description of this module..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-mod-region">Region Name</Label>
            <Input 
              id="new-mod-region" 
              value={regionName} 
              onChange={(e) => setRegionName(e.target.value)} 
              placeholder="e.g. Andean Highlands"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || !title.trim()}>
              {createMutation.isPending ? 'Creating...' : 'Create Module'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
