import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Save, FolderOpen, Trash2, Loader2 } from 'lucide-react';
import {
  useAvailabilityTemplates,
  useCreateAvailabilityTemplate,
  useDeleteAvailabilityTemplate,
  type TemplateSlot,
} from '@/hooks/useAvailabilityTemplates';
import { useMyAvailability, useCreateAvailability, useDeleteAvailability } from '@/hooks/useTutorAvailability';
import { toast } from 'sonner';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AvailabilityTemplateManager() {
  const { data: templates, isLoading } = useAvailabilityTemplates();
  const createTemplate = useCreateAvailabilityTemplate();
  const deleteTemplate = useDeleteAvailabilityTemplate();
  const { data: currentAvailability } = useMyAvailability();
  const createAvailability = useCreateAvailability();
  const deleteAvailability = useDeleteAvailability();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [applying, setApplying] = useState<string | null>(null);

  const handleSaveCurrent = async () => {
    if (!templateName.trim()) { toast.error('Please enter a template name'); return; }
    if (!currentAvailability?.length) { toast.error('No availability to save'); return; }

    const slots: TemplateSlot[] = currentAvailability
      .filter(a => a.is_recurring)
      .map(a => ({
        day_of_week: a.day_of_week!,
        start_time: a.start_time!,
        end_time: a.end_time!,
        timezone: a.timezone,
      }));

    if (!slots.length) { toast.error('No recurring slots to save as template'); return; }

    try {
      await createTemplate.mutateAsync({ name: templateName.trim(), slots });
      toast.success('Template saved');
      setSaveDialogOpen(false);
      setTemplateName('');
    } catch {
      toast.error('Failed to save template');
    }
  };

  const handleApplyTemplate = async (templateId: string, slots: TemplateSlot[]) => {
    setApplying(templateId);
    try {
      // Delete existing recurring availability
      if (currentAvailability) {
        for (const avail of currentAvailability.filter(a => a.is_recurring)) {
          await deleteAvailability.mutateAsync(avail.id);
        }
      }
      // Create new from template
      for (const slot of slots) {
        await createAvailability.mutateAsync({
          is_recurring: true,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          timezone: slot.timezone,
        });
      }
      toast.success('Template applied successfully');
    } catch {
      toast.error('Failed to apply template');
    } finally {
      setApplying(null);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <FolderOpen className="h-4 w-4" /> Availability Templates
        </h4>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSaveDialogOpen(true)}>
          <Save className="h-3 w-3 mr-1" /> Save Current
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : templates?.length ? (
        <div className="space-y-2">
          {templates.map(template => (
            <Card key={template.id}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{template.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.slots.map((slot, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {DAYS[slot.day_of_week]} {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleApplyTemplate(template.id, template.slots)}
                    disabled={applying === template.id}
                  >
                    {applying === template.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Apply'}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">
          No saved templates. Set up your availability and save it as a template for easy reuse.
        </p>
      )}

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Availability Template</DialogTitle>
            <DialogDescription>Save your current recurring availability as a reusable template.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Template name (e.g. 'Spring Schedule')"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCurrent} disabled={createTemplate.isPending}>
              {createTemplate.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
