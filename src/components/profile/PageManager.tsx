import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  useProfilePages, 
  useCreatePage, 
  useUpdatePage, 
  useDeletePage, 
  useReorderPages,
  usePageSectionCounts,
  useEnsureHomePage,
  ProfilePage
} from '@/hooks/useProfilePages';
import { 
  Plus, GripVertical, Home, Edit2, Trash2, Eye, EyeOff, 
  FileText, LayoutGrid, ExternalLink, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PageManagerProps {
  userId: string;
  onManageSections?: (pageId: string, pageTitle: string) => void;
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Sortable page item component
function SortablePageItem({ 
  page, 
  sectionCount,
  onEdit,
  onDelete,
  onToggleVisibility,
  onManageSections,
}: { 
  page: ProfilePage;
  sectionCount: number;
  onEdit: (page: ProfilePage) => void;
  onDelete: (page: ProfilePage) => void;
  onToggleVisibility: (page: ProfilePage) => void;
  onManageSections: (page: ProfilePage) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id, disabled: page.is_home });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-card border rounded-lg group',
        isDragging && 'opacity-50 z-50',
        !page.is_visible && 'opacity-60'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          'p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing',
          page.is_home && 'opacity-30 cursor-not-allowed'
        )}
        disabled={page.is_home}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Page info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {page.is_home && <Home className="h-4 w-4 text-primary" />}
          <span className="font-medium truncate">{page.title}</span>
          {!page.is_visible && (
            <Badge variant="secondary" className="text-xs">Hidden</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          /{page.slug} • {sectionCount} section{sectionCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => onManageSections(page)}
          title="Manage sections"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => onToggleVisibility(page)}
          title={page.is_visible ? 'Hide page' : 'Show page'}
        >
          {page.is_visible ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => onEdit(page)}
          title="Edit page"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        
        {!page.is_home && page.slug !== 'about' && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            onClick={() => onDelete(page)}
            title="Delete page"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function PageManager({ userId, onManageSections }: PageManagerProps) {
  const { data: pages = [], isLoading } = useProfilePages(userId);
  const { data: sectionCounts = {} } = usePageSectionCounts(userId);
  const ensureHomePage = useEnsureHomePage();
  const createPage = useCreatePage();
  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();
  const reorderPages = useReorderPages();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<ProfilePage | null>(null);
  const [deleteConfirmPage, setDeleteConfirmPage] = useState<ProfilePage | null>(null);
  const [formData, setFormData] = useState({ title: '', slug: '' });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Ensure home page exists on mount
  useEffect(() => {
    if (!isLoading && pages.length === 0) {
      ensureHomePage.mutate();
    }
  }, [isLoading, pages.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = pages.findIndex(p => p.id === active.id);
    const newIndex = pages.findIndex(p => p.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(pages, oldIndex, newIndex);
      reorderPages.mutate(reordered.map(p => p.id));
    }
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: slugManuallyEdited ? prev.slug : generateSlug(title),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setSlugManuallyEdited(true);
    setFormData(prev => ({ ...prev, slug: generateSlug(slug) }));
  };

  const handleCreatePage = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a page title');
      return;
    }
    
    await createPage.mutateAsync({
      title: formData.title.trim(),
      slug: formData.slug || generateSlug(formData.title),
    });
    
    setCreateDialogOpen(false);
    setFormData({ title: '', slug: '' });
    setSlugManuallyEdited(false);
  };

  const handleEditPage = async () => {
    if (!editingPage || !formData.title.trim()) return;
    
    await updatePage.mutateAsync({
      id: editingPage.id,
      title: formData.title.trim(),
      slug: formData.slug || generateSlug(formData.title),
    });
    
    setEditingPage(null);
    setFormData({ title: '', slug: '' });
    setSlugManuallyEdited(false);
    toast.success('Page updated');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmPage) return;
    await deletePage.mutateAsync(deleteConfirmPage.id);
    setDeleteConfirmPage(null);
  };

  const handleToggleVisibility = async (page: ProfilePage) => {
    await updatePage.mutateAsync({
      id: page.id,
      is_visible: !page.is_visible,
    });
    toast.success(page.is_visible ? 'Page hidden' : 'Page visible');
  };

  const openEditDialog = (page: ProfilePage) => {
    setEditingPage(page);
    setFormData({ title: page.title, slug: page.slug });
    setSlugManuallyEdited(true);
  };

  const handleManageSections = (page: ProfilePage) => {
    if (onManageSections) {
      onManageSections(page.id, page.title);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Website Pages
        </CardTitle>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              variant="outline"
              disabled={pages.length >= 5}
              title={pages.length >= 5 ? 'Maximum 5 pages allowed' : 'Add a new page'}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Page {pages.length >= 5 && '(Max 5)'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Page</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Page Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g., Shop, Videos, Tour Dates"
                />
              </div>
              <div>
                <Label>URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  <Input
                    value={formData.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="auto-generated"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This will be the URL path for this page
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePage} disabled={createPage.isPending}>
                Create Page
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-2">
        {pages.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No pages yet. Click "Add Page" to create your first page.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {pages.map(page => (
                <SortablePageItem
                  key={page.id}
                  page={page}
                  sectionCount={sectionCounts[page.id] || 0}
                  onEdit={openEditDialog}
                  onDelete={setDeleteConfirmPage}
                  onToggleVisibility={handleToggleVisibility}
                  onManageSections={handleManageSections}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
        {/* Removed unassigned sections notice - sections with null page_id are hidden until assigned */}
      </CardContent>

      {/* Edit Page Dialog */}
      <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Page Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Page title"
              />
            </div>
            <div>
              <Label>URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">/</span>
                <Input
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPage(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditPage} disabled={updatePage.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmPage} onOpenChange={(open) => !open && setDeleteConfirmPage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Are you sure you want to delete "{deleteConfirmPage?.title}"? 
            Any sections on this page will be moved to unassigned.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmPage(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deletePage.isPending}>
              Delete Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
