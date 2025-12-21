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
import { ChevronDown, ChevronRight, Edit, Trash2, Plus, ArrowLeft, Video, BookOpen, Music, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { ModuleEditDialog } from './ModuleEditDialog';
import { LessonEditDialog } from './LessonEditDialog';

interface CourseContentManagerProps {
  courseId: string;
  courseTitle: string;
  onBack: () => void;
}

export function CourseContentManager({ courseId, courseTitle, onBack }: CourseContentManagerProps) {
  const queryClient = useQueryClient();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingModule, setEditingModule] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'module' | 'lesson'; id: string; title: string } | null>(null);

  const { data: modules, isLoading } = useQuery({
    queryKey: ['admin-course-modules', courseId],
    queryFn: async () => {
      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
      if (modulesError) throw modulesError;

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
      }));
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      // Delete lessons first
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
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'module') {
      deleteModuleMutation.mutate(deleteTarget.id);
    } else {
      deleteLessonMutation.mutate(deleteTarget.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{courseTitle}</h2>
          <p className="text-sm text-muted-foreground">Manage modules and lessons</p>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      ) : modules?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No modules yet. Import data using the Import tab.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {modules?.map((module) => (
            <Card key={module.id}>
              <Collapsible open={expandedModules.has(module.id)} onOpenChange={() => toggleModule(module.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedModules.has(module.id) ? (
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
                        <Button variant="ghost" size="icon" onClick={() => setEditingModule(module)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ type: 'module', id: module.id, title: module.title })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-3">
                    <div className="border-l-2 border-muted ml-2 pl-4 space-y-1">
                      {module.lessons?.map((lesson: any) => (
                        <div 
                          key={lesson.id} 
                          className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{getLessonIcon(lesson.lesson_type)}</span>
                            <div>
                              <p className="text-sm font-medium">{lesson.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {lesson.lesson_type}
                                {lesson.video_url && ` • Soundslice: ${lesson.video_url}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingLesson(lesson)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ type: 'lesson', id: lesson.id, title: lesson.title })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(!module.lessons || module.lessons.length === 0) && (
                        <p className="text-sm text-muted-foreground py-2">No lessons in this module</p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
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
