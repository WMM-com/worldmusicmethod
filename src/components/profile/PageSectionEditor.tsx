import { useState, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useProfileSections, 
  useCreateSection, 
  useDeleteSection,
  useReorderSections,
  ProfileSection 
} from '@/hooks/useProfilePortfolio';
import { useProfilePages, useUpdateSectionPage, ProfilePage } from '@/hooks/useProfilePages';
import { 
  Plus, GripVertical, Trash2, ArrowLeft, Music, Video, Image, 
  FileText, Layout, Headphones, Code, Share2, DollarSign, ShoppingBag, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PageSectionEditorProps {
  userId: string;
  pageId: string;
  pageTitle: string;
  onBack: () => void;
}

const SECTION_TYPES = [
  { type: 'text_block', label: 'Text Block', icon: FileText },
  { type: 'gallery', label: 'Gallery', icon: Image },
  { type: 'projects', label: 'Projects', icon: Layout },
  { type: 'custom_tabs', label: 'Info Tabs', icon: FileText },
  { type: 'audio_player', label: 'Audio Player', icon: Headphones },
  { type: 'youtube', label: 'YouTube', icon: Video },
  { type: 'spotify', label: 'Spotify', icon: Music },
  { type: 'soundcloud', label: 'SoundCloud', icon: Headphones },
  { type: 'generic', label: 'Other Embed', icon: Code },
  { type: 'social_feed', label: 'Social Feed', icon: Share2 },
  { type: 'donation', label: 'Tip Jar', icon: DollarSign },
  { type: 'digital_products', label: 'Digital Products', icon: ShoppingBag },
  { type: 'events', label: 'Events', icon: Calendar },
];

// Sortable section item
function SortableSectionItem({ 
  section, 
  pages,
  onDelete,
  onChangePage,
}: { 
  section: ProfileSection;
  pages: ProfilePage[];
  onDelete: () => void;
  onChangePage: (pageId: string | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sectionInfo = SECTION_TYPES.find(s => s.type === section.section_type);
  const Icon = sectionInfo?.icon || FileText;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-card border rounded-lg group',
        isDragging && 'opacity-50 z-50'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-medium truncate block">
            {section.title || sectionInfo?.label || section.section_type}
          </span>
          <span className="text-xs text-muted-foreground">
            {sectionInfo?.label}
          </span>
        </div>
      </div>

      {/* Page selector */}
      <Select
        value={section.page_id || 'unassigned'}
        onValueChange={(value) => onChangePage(value === 'unassigned' ? null : value)}
      >
        <SelectTrigger className="w-24 sm:w-32 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {pages.map(page => (
            <SelectItem key={page.id} value={page.id}>
              {page.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-destructive opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function PageSectionEditor({ userId, pageId, pageTitle, onBack }: PageSectionEditorProps) {
  const { data: sections = [], isLoading } = useProfileSections(userId, pageId);
  const { data: pages = [] } = useProfilePages(userId);
  const createSection = useCreateSection();
  const deleteSection = useDeleteSection();
  const reorderSections = useReorderSections();
  const updateSectionPage = useUpdateSectionPage();

  const [addSectionOpen, setAddSectionOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(sections, oldIndex, newIndex);
      reorderSections.mutate(reordered.map(s => s.id));
    }
  }, [sections, reorderSections]);

  const handleAddSection = async (sectionType: string) => {
    const sectionInfo = SECTION_TYPES.find(s => s.type === sectionType);
    await createSection.mutateAsync({
      section_type: sectionType,
      title: sectionInfo?.label || sectionType,
      page_id: pageId,
    });
    setAddSectionOpen(false);
  };

  const handleChangePage = async (sectionId: string, newPageId: string | null) => {
    await updateSectionPage.mutateAsync({ sectionId, pageId: newPageId });
    toast.success('Section moved');
  };

  const handleDeleteSection = async (sectionId: string) => {
    await deleteSection.mutateAsync(sectionId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Loading...</CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 py-4">
        <Button size="icon" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <CardTitle className="text-lg">
            Sections on "{pageTitle}"
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {sections.length} section{sections.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddSectionOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Section
        </Button>
      </CardHeader>

      <CardContent className="space-y-2">
        {sections.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No sections on this page yet. Click "Add Section" to add content.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map(section => (
                <SortableSectionItem
                  key={section.id}
                  section={section}
                  pages={pages}
                  onDelete={() => handleDeleteSection(section.id)}
                  onChangePage={(newPageId) => handleChangePage(section.id, newPageId)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      {/* Add Section Dialog */}
      <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section to {pageTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {SECTION_TYPES.map(({ type, label, icon: Icon }) => (
              <Button
                key={type}
                variant="outline"
                className="h-auto py-3 px-4 flex flex-col items-center gap-1"
                onClick={() => handleAddSection(type)}
                disabled={createSection.isPending}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
