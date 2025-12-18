import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { BookOpen, Users, MapPin, Eye, Edit } from 'lucide-react';
import { CourseEditDialog } from './CourseEditDialog';

export function AdminCourses() {
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  const [dialogOpen, setDialogOpen] = useState(false);

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
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleEdit(course, e)}
                        >
                          <Edit className="h-4 w-4" />
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
              <div className="flex justify-end">
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
    </>
  );
}
