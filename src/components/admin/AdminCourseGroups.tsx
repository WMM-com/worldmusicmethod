import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FolderOpen, X } from 'lucide-react';

interface CourseGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface GroupCourse {
  id: string;
  group_id: string;
  course_id: string;
  courses: { title: string };
}

export function AdminCourseGroups() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CourseGroup | null>(null);
  const [managingGroup, setManagingGroup] = useState<CourseGroup | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['admin-course-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_groups')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CourseGroup[];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ['admin-all-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  const { data: groupCourses } = useQuery({
    queryKey: ['admin-group-courses', managingGroup?.id],
    queryFn: async () => {
      if (!managingGroup) return [];
      const { data, error } = await supabase
        .from('course_group_courses')
        .select('*, courses:course_id(title)')
        .eq('group_id', managingGroup.id);
      if (error) throw error;
      return data as GroupCourse[];
    },
    enabled: !!managingGroup,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('course_groups').insert({
        name,
        description: description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-groups'] });
      toast.success('Course group created');
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create group');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingGroup) return;
      const { error } = await supabase
        .from('course_groups')
        .update({ name, description: description || null })
        .eq('id', editingGroup.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-groups'] });
      toast.success('Course group updated');
      resetForm();
      setEditingGroup(null);
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update group');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('course_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-groups'] });
      toast.success('Course group deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete group');
    },
  });

  const addCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!managingGroup) return;
      const { error } = await supabase.from('course_group_courses').insert({
        group_id: managingGroup.id,
        course_id: courseId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-group-courses'] });
      toast.success('Course added to group');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add course');
    },
  });

  const removeCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('course_group_courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-group-courses'] });
      toast.success('Course removed from group');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove course');
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setEditingGroup(null);
  };

  const handleEdit = (group: CourseGroup) => {
    setEditingGroup(group);
    setName(group.name);
    setDescription(group.description || '');
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroup) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const getGroupCourseIds = () => {
    return groupCourses?.map(gc => gc.course_id) || [];
  };

  const availableCourses = courses?.filter(c => !getGroupCourseIds().includes(c.id)) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Course Groups</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGroup ? 'Edit Group' : 'Create Course Group'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Premium Membership"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description of this course group..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingGroup ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Manage Courses Dialog */}
        <Dialog open={!!managingGroup} onOpenChange={(open) => !open && setManagingGroup(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Courses in "{managingGroup?.name}"</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-sm font-medium">Current Courses</Label>
                <div className="mt-2 space-y-2">
                  {groupCourses?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No courses in this group yet</p>
                  ) : (
                    groupCourses?.map((gc) => (
                      <div key={gc.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/10">
                        <span>{gc.courses.title}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCourseMutation.mutate(gc.id)}
                          disabled={removeCourseMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Add Courses</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {availableCourses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">All courses are in this group</p>
                  ) : (
                    availableCourses.map((course) => (
                      <div key={course.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <span>{course.title}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addCourseMutation.mutate(course.id)}
                          disabled={addCourseMutation.isPending}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Courses</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : groups?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No course groups yet
                </TableCell>
              </TableRow>
            ) : (
              groups?.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      {group.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {group.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setManagingGroup(group)}
                    >
                      Manage Courses
                    </Button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(group.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(group)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(group.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
  );
}
