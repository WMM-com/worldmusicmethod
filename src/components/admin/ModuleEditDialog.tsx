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

interface ModuleEditDialogProps {
  module: {
    id: string;
    title: string;
    description: string | null;
    region_name: string | null;
    color_theme: string | null;
    icon_type: string | null;
    estimated_duration: number | null;
    order_index: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModuleEditDialog({ module, open, onOpenChange }: ModuleEditDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description || '');
  const [regionName, setRegionName] = useState(module.region_name || '');
  const [colorTheme, setColorTheme] = useState(module.color_theme || 'earth');
  const [iconType, setIconType] = useState(module.icon_type || 'mountain');
  const [duration, setDuration] = useState(module.estimated_duration?.toString() || '');
  const [orderIndex, setOrderIndex] = useState(module.order_index.toString());

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('course_modules')
        .update({
          title,
          description: description || null,
          region_name: regionName || null,
          color_theme: colorTheme || 'earth',
          icon_type: iconType || 'mountain',
          estimated_duration: duration ? parseInt(duration) : null,
          order_index: parseInt(orderIndex),
        })
        .eq('id', module.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules'] });
      toast.success('Module updated');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update module');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Module</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mod-title">Title</Label>
            <Input id="mod-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mod-desc">Description</Label>
            <Textarea id="mod-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mod-region">Region Name</Label>
              <Input id="mod-region" value={regionName} onChange={(e) => setRegionName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mod-order">Order</Label>
              <Input id="mod-order" type="number" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mod-color">Color Theme</Label>
              <Input id="mod-color" value={colorTheme} onChange={(e) => setColorTheme(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mod-duration">Duration (mins)</Label>
              <Input id="mod-duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
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
