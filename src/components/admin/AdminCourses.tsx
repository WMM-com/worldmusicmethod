import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { BookOpen, Users, MapPin, Eye, Edit, Trash2, FolderOpen } from 'lucide-react';
import { CourseEditDialog } from './CourseEditDialog';
import { CourseContentManager } from './CourseContentManager';
import { toast } from 'sonner';

export function AdminCourses() {
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'view' | 'edit' | 'content'>('view');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollmentCounts } = useQuery({
    queryKey: ['admin-enrollment-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('course_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(e => {
        counts[e.course_id] = (counts[e.course_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: moduleCounts } = useQuery({
    queryKey: ['admin-module-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select('course_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(m => {
        counts[m.course_id] = (counts[m.course_id] || 0) + 1;
      });
      return counts;
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      // Delete in order: lesson progress, lessons, modules, enrollments, course
      const { data: modules } = await supabase
        .from('course_modules')
        .select('id')
        .eq('course_id', courseId);

      if (modules && modules.length > 0) {
        const moduleIds = modules.map(m => m.id);
        
        // Delete user progress for lessons in these modules
        const { data: lessons } = await supabase
          .from('module_lessons')
          .select('id')
          .in('module_id', moduleIds);
        
        if (lessons && lessons.length > 0) {
          const lessonIds = lessons.map(l => l.id);
          await supabase.from('user_lesson_progress').delete().in('lesson_id', lessonIds);
        }

        // Delete lessons
        await supabase.from('module_lessons').delete().in('module_id', moduleIds);
      }

      // Delete modules
      await supabase.from('course_modules').delete().eq('course_id', courseId);

      // Delete enrollments
      await supabase.from('course_enrollments').delete().eq('course_id', courseId);


      // Delete course
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-module-counts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-enrollment-counts'] });
      toast.success('Course deleted');
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete course');
    },
  });

  const handleRowClick = (course: any) => {
    setSelectedCourse(course);
    setViewMode('view');
    setDialogOpen(true);
  };

  const handleEdit = (course: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCourse(course);
    setViewMode('edit');
    setDialogOpen(true);
  };

  const handleManageContent = (course: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCourse(course);
    setViewMode('content');
  };

  if (viewMode === 'content' && selectedCourse) {
    return (
      <CourseContentManager
        courseId={selectedCourse.id}
        courseTitle={selectedCourse.title}
        onBack={() => {
          setViewMode('view');
          setSelectedCourse(null);
        }}
      />
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Enrollments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : courses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No courses yet
                  </TableCell>
                </TableRow>
              ) : (
                courses?.map((course) => (
                  <TableRow 
                    key={course.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(course)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{course.title}</p>
                          {course.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {course.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {course.country}
                      </div>
                    </TableCell>
                    <TableCell>
                      {moduleCounts?.[course.id] || 0} modules
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {enrollmentCounts?.[course.id] || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={course.is_published ? 'default' : 'secondary'}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(course.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(course);
                          }}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleManageContent(course, e)}
                          title="Manage Content"
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleEdit(course, e)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: course.id, title: course.title });
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {viewMode === 'view' ? 'Course Details' : 'Edit Course'}
            </DialogTitle>
          </DialogHeader>
          {selectedCourse && viewMode === 'view' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Title</label>
                  <p className="mt-1">{selectedCourse.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Country</label>
                  <p className="mt-1">{selectedCourse.country}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="mt-1">
                    <Badge variant={selectedCourse.is_published ? 'default' : 'secondary'}>
                      {selectedCourse.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="mt-1">{new Date(selectedCourse.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedCourse.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1">{selectedCourse.description}</p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDialogOpen(false);
                    setViewMode('content');
                  }}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Manage Content
                </Button>
                <Button onClick={() => setViewMode('edit')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Course
                </Button>
              </div>
            </div>
          )}
          {selectedCourse && viewMode === 'edit' && (
            <CourseEditDialog 
              course={selectedCourse} 
              onClose={() => setDialogOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? 
              This will permanently delete all modules, lessons, enrollments, and progress data. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteTarget && deleteCourseMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCourseMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
