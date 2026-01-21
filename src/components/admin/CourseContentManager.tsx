import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, Edit, Trash2, Plus, ArrowLeft, Video, BookOpen, Music, FileText, GripVertical, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { ModuleEditDialog } from './ModuleEditDialog';
import { LessonEditDialog } from './LessonEditDialog';
import { ModuleCreateDialog } from './ModuleCreateDialog';
import { LessonCreateDialog } from './LessonCreateDialog';
import { TestEditor } from './TestEditor';

interface CourseContentManagerProps {
  courseId: string;
  courseTitle: string;
  onBack: () => void;
}

interface ModuleWithLessons {
  id: string;
  title: string;
  description: string | null;
  region_name: string | null;
  order_index: number;
  lessons: any[];
  [key: string]: any;
}

// Sortable Module Item
function SortableModuleCard({ 
  module, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onDelete, 
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  getLessonIcon,
  children,
}: {
  module: ModuleWithLessons;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: any) => void;
  onDeleteLesson: (lesson: any) => void;
  getLessonIcon: (type: string) => JSX.Element;
  children?: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'ring-2 ring-primary' : ''}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  {...attributes} 
                  {...listeners} 
                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-base">{module.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {module.lessons?.length || 0} lessons
                    {module.region_name && ` • ${module.region_name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={onAddLesson} title="Add Lesson">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Sortable Lesson Item
function SortableLessonItem({ 
  lesson, 
  getLessonIcon, 
  onEdit, 
  onEditTest,
  onDelete 
}: { 
  lesson: any; 
  getLessonIcon: (type: string) => JSX.Element;
  onEdit: () => void;
  onEditTest?: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 group ${isDragging ? 'ring-2 ring-primary bg-muted' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
        <span className="text-muted-foreground">{getLessonIcon(lesson.lesson_type)}</span>
        <div>
          <p className="text-sm font-medium">{lesson.title}</p>
          <p className="text-xs text-muted-foreground">
            {lesson.lesson_type}
            {lesson.video_url && ` • Soundslice: ${lesson.video_url}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {lesson.title?.toLowerCase().startsWith('test') && onEditTest && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs bg-primary/10 border-primary/30 text-primary hover:bg-primary/20" 
            onClick={onEditTest}
          >
            <ClipboardCheck className="h-3 w-3 mr-1" />
            Edit Quiz
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onEdit}>
          <Edit className="h-3 w-3" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function CourseContentManager({ courseId, courseTitle, onBack }: CourseContentManagerProps) {
  const queryClient = useQueryClient();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingModule, setEditingModule] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'module' | 'lesson'; id: string; title: string } | null>(null);
  const [showAddModule, setShowAddModule] = useState(false);
  const [addLessonTarget, setAddLessonTarget] = useState<{ moduleId: string; nextIndex: number } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTestLesson, setEditingTestLesson] = useState<{ id: string; title: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: modules, isLoading } = useQuery({
    queryKey: ['admin-course-modules', courseId],
    queryFn: async () => {
      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
      if (modulesError) throw modulesError;

      if (modulesData.length === 0) return [];

      const moduleIds = modulesData.map(m => m.id);
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('module_lessons')
        .select('*')
        .in('module_id', moduleIds)
        .order('order_index', { ascending: true });
      if (lessonsError) throw lessonsError;

      return modulesData.map(mod => ({
        ...mod,
        lessons: lessonsData.filter(l => l.module_id === mod.id),
      })) as ModuleWithLessons[];
    },
  });

  const reorderModulesMutation = useMutation({
    mutationFn: async (reorderedModules: { id: string; order_index: number }[]) => {
      const updates = reorderedModules.map(m => 
        supabase.from('course_modules').update({ order_index: m.order_index }).eq('id', m.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] });
    },
    onError: (error: any) => {
      toast.error('Failed to reorder modules');
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] });
    },
  });

  const reorderLessonsMutation = useMutation({
    mutationFn: async (reorderedLessons: { id: string; order_index: number; module_id: string }[]) => {
      const updates = reorderedLessons.map(l => 
        supabase.from('module_lessons').update({ order_index: l.order_index, module_id: l.module_id }).eq('id', l.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] });
    },
    onError: (error: any) => {
      toast.error('Failed to reorder lessons');
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const { error: lessonsError } = await supabase
        .from('module_lessons')
        .delete()
        .eq('module_id', moduleId);
      if (lessonsError) throw lessonsError;

      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', moduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] });
      queryClient.invalidateQueries({ queryKey: ['admin-module-counts'] });
      toast.success('Module deleted');
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete module');
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase
        .from('module_lessons')
        .delete()
        .eq('id', lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] });
      toast.success('Lesson deleted');
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete lesson');
    },
  });

  const toggleModule = (moduleId: string) => {
    const next = new Set(expandedModules);
    if (next.has(moduleId)) {
      next.delete(moduleId);
    } else {
      next.add(moduleId);
    }
    setExpandedModules(next);
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'listening': return <Music className="h-4 w-4" />;
      case 'reading': return <BookOpen className="h-4 w-4" />;
      case 'test': return <ClipboardCheck className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Check if lesson title starts with "Test" for test editing
  const isTestLesson = (lesson: any) => {
    return lesson.title?.toLowerCase().startsWith('test');
  };

  // If editing a test, show TestEditor
  if (editingTestLesson) {
    return (
      <TestEditor
        lessonId={editingTestLesson.id}
        lessonTitle={editingTestLesson.title}
        onBack={() => setEditingTestLesson(null)}
      />
    );
  }

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'module') {
      deleteModuleMutation.mutate(deleteTarget.id);
    } else {
      deleteLessonMutation.mutate(deleteTarget.id);
    }
  };

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id || !modules) return;

    // Check if dragging a module
    const activeModuleIndex = modules.findIndex(m => m.id === active.id);
    const overModuleIndex = modules.findIndex(m => m.id === over.id);

    if (activeModuleIndex !== -1 && overModuleIndex !== -1) {
      const reordered = arrayMove(modules, activeModuleIndex, overModuleIndex);
      const updates = reordered.map((m, idx) => ({ id: m.id, order_index: idx }));
      reorderModulesMutation.mutate(updates);
      return;
    }

    // Check if dragging a lesson within same module
    for (const mod of modules) {
      const activeLessonIndex = mod.lessons.findIndex((l: any) => l.id === active.id);
      const overLessonIndex = mod.lessons.findIndex((l: any) => l.id === over.id);

      if (activeLessonIndex !== -1 && overLessonIndex !== -1) {
        const reordered = arrayMove(mod.lessons, activeLessonIndex, overLessonIndex);
        const updates = reordered.map((l: any, idx: number) => ({ 
          id: l.id, 
          order_index: idx,
          module_id: mod.id
        }));
        reorderLessonsMutation.mutate(updates);
        return;
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const moduleIds = modules?.map(m => m.id) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{courseTitle}</h2>
            <p className="text-sm text-muted-foreground">Manage modules and lessons</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModule(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Module
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      ) : modules?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="mb-4">No modules yet.</p>
            <Button onClick={() => setShowAddModule(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Module
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleModuleDragEnd}
        >
          <SortableContext items={moduleIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {modules?.map((module) => (
                <SortableModuleCard
                  key={module.id}
                  module={module}
                  isExpanded={expandedModules.has(module.id)}
                  onToggle={() => toggleModule(module.id)}
                  onEdit={() => setEditingModule(module)}
                  onDelete={() => setDeleteTarget({ type: 'module', id: module.id, title: module.title })}
                  onAddLesson={() => setAddLessonTarget({ 
                    moduleId: module.id, 
                    nextIndex: module.lessons?.length || 0 
                  })}
                  onEditLesson={(lesson) => setEditingLesson(lesson)}
                  onDeleteLesson={(lesson) => setDeleteTarget({ type: 'lesson', id: lesson.id, title: lesson.title })}
                  getLessonIcon={getLessonIcon}
                >
                  <div className="border-l-2 border-muted ml-2 pl-4 space-y-1">
                    <SortableContext 
                      items={module.lessons?.map((l: any) => l.id) || []} 
                      strategy={verticalListSortingStrategy}
                    >
                      {module.lessons?.map((lesson: any) => (
                        <SortableLessonItem
                          key={lesson.id}
                          lesson={lesson}
                          getLessonIcon={getLessonIcon}
                          onEdit={() => setEditingLesson(lesson)}
                          onEditTest={lesson.title?.toLowerCase().startsWith('test') 
                            ? () => setEditingTestLesson({ id: lesson.id, title: lesson.title })
                            : undefined
                          }
                          onDelete={() => setDeleteTarget({ type: 'lesson', id: lesson.id, title: lesson.title })}
                        />
                      ))}
                    </SortableContext>
                    {(!module.lessons || module.lessons.length === 0) && (
                      <p className="text-sm text-muted-foreground py-2">No lessons in this module</p>
                    )}
                  </div>
                </SortableModuleCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Module Dialog */}
      <ModuleCreateDialog
        courseId={courseId}
        nextOrderIndex={modules?.length || 0}
        open={showAddModule}
        onOpenChange={setShowAddModule}
      />

      {/* Add Lesson Dialog */}
      {addLessonTarget && (
        <LessonCreateDialog
          moduleId={addLessonTarget.moduleId}
          courseId={courseId}
          nextOrderIndex={addLessonTarget.nextIndex}
          open={!!addLessonTarget}
          onOpenChange={(open) => !open && setAddLessonTarget(null)}
        />
      )}

      {editingModule && (
        <ModuleEditDialog 
          module={editingModule} 
          open={!!editingModule} 
          onOpenChange={(open) => !open && setEditingModule(null)} 
        />
      )}

      {editingLesson && (
        <LessonEditDialog 
          lesson={editingLesson} 
          open={!!editingLesson} 
          onOpenChange={(open) => !open && setEditingLesson(null)} 
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? 
              {deleteTarget?.type === 'module' && ' This will also delete all lessons in this module.'}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
