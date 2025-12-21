import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search, BookOpen, UserPlus, Shield, Users, Pencil } from 'lucide-react';

type AppRole = 'user' | 'admin';

export function AdminUsers() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; full_name: string; email: string } | null>(null);
  // New user form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ['admin-courses-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('id, title').order('title');
      if (error) throw error;
      return data;
    },
  });

  const { data: courseGroups } = useQuery({
    queryKey: ['admin-course-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_groups')
        .select('*, course_group_courses(course_id)');
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ['admin-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('user_id, course_id, courses(title)');
      if (error) throw error;
      return data;
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async ({ userId, courseIds }: { userId: string; courseIds: string[] }) => {
      const currentUser = (await supabase.auth.getUser()).data.user;
      const existingEnrollments = enrollments?.filter(e => e.user_id === userId).map(e => e.course_id) || [];
      const newCourseIds = courseIds.filter(id => !existingEnrollments.includes(id));

      if (newCourseIds.length === 0) {
        throw new Error('User is already enrolled in all selected courses');
      }

      const { error } = await supabase.from('course_enrollments').insert(
        newCourseIds.map(courseId => ({
          user_id: userId,
          course_id: courseId,
          enrollment_type: 'manual',
          enrolled_by: currentUser?.id,
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
      toast.success('User enrolled successfully');
      setEnrollDialogOpen(false);
      setSelectedUserId(null);
      setSelectedCourseIds([]);
      setSelectedGroupIds([]);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to enroll user');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First delete existing role
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      // Then insert new role - cast to any to handle enum type
      const { error } = await supabase.from('user_roles').insert([{
        user_id: userId,
        role: role as any,
      }]);
      if (error) throw error;

      // Role updated successfully
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
      toast.success('User role updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update role');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, fullName, email }: { userId: string; fullName: string; email: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, email })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated successfully');
      setEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user');
    },
  });

  const getUserRole = (userId: string): AppRole => {
    const role = userRoles?.find(r => r.user_id === userId);
    return (role?.role as AppRole) || 'user';
  };

  const getUserEnrollments = (userId: string) => {
    return enrollments?.filter(e => e.user_id === userId) || [];
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const getCoursesFromGroups = () => {
    if (!courseGroups) return [];
    return courseGroups
      .filter(g => selectedGroupIds.includes(g.id))
      .flatMap(g => (g.course_group_courses as any[])?.map(c => c.course_id) || []);
  };

  const handleEnroll = () => {
    if (!selectedUserId) return;
    const groupCourseIds = getCoursesFromGroups();
    const allCourseIds = [...new Set([...selectedCourseIds, ...groupCourseIds])];
    
    if (allCourseIds.length === 0) {
      toast.error('Please select at least one course or course group');
      return;
    }
    
    enrollMutation.mutate({ userId: selectedUserId, courseIds: allCourseIds });
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserName || !newUserPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserName,
          role: newUserRole,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('User created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      
      // Reset form
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setNewUserRole('user');
      setCreateUserDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'default';
      default: return 'outline';
    }
  };

  const selectedCount = selectedCourseIds.length + selectedGroupIds.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Users
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the platform.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter full name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUserRole} onValueChange={(value: 'user' | 'admin') => setNewUserRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin (Full access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateUser} className="w-full">
                  Create User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Enrolled Courses</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users?.map((user) => {
                const role = getUserRole(user.id);
                const userEnrollments = getUserEnrollments(user.id);
                
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={role}
                        onValueChange={(value: AppRole) => updateRoleMutation.mutate({ userId: user.id, role: value })}
                      >
                        <SelectTrigger className="w-28">
                          <Badge variant={getRoleBadgeVariant(role)} className="pointer-events-none">
                            {role}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {userEnrollments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {userEnrollments.slice(0, 2).map((e: any, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {e.courses?.title}
                            </Badge>
                          ))}
                          {userEnrollments.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{userEnrollments.length - 2} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingUser({ id: user.id, full_name: user.full_name || '', email: user.email });
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Dialog open={enrollDialogOpen && selectedUserId === user.id} onOpenChange={(open) => {
                          setEnrollDialogOpen(open);
                          if (!open) {
                            setSelectedUserId(null);
                            setSelectedCourseIds([]);
                            setSelectedGroupIds([]);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUserId(user.id)}
                            >
                              <BookOpen className="h-4 w-4 mr-1" />
                              Enroll
                            </Button>
                          </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Enroll User in Courses</DialogTitle>
                            <DialogDescription>
                              Select courses or course groups to enroll {user.full_name || user.email}.
                            </DialogDescription>
                          </DialogHeader>
                          <Tabs defaultValue="courses" className="pt-4">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="courses">Individual Courses</TabsTrigger>
                              <TabsTrigger value="groups">Course Groups</TabsTrigger>
                            </TabsList>
                            <TabsContent value="courses" className="space-y-2 max-h-60 overflow-y-auto">
                              {courses?.map((course) => {
                                const isEnrolled = userEnrollments.some(e => e.course_id === course.id);
                                return (
                                  <div
                                    key={course.id}
                                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50"
                                  >
                                    <Checkbox
                                      id={`course-${course.id}`}
                                      checked={selectedCourseIds.includes(course.id) || isEnrolled}
                                      disabled={isEnrolled}
                                      onCheckedChange={() => toggleCourse(course.id)}
                                    />
                                    <label
                                      htmlFor={`course-${course.id}`}
                                      className={`flex-1 text-sm cursor-pointer ${isEnrolled ? 'text-muted-foreground' : ''}`}
                                    >
                                      {course.title}
                                      {isEnrolled && <span className="ml-2 text-xs">(enrolled)</span>}
                                    </label>
                                  </div>
                                );
                              })}
                              {(!courses || courses.length === 0) && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No courses available
                                </p>
                              )}
                            </TabsContent>
                            <TabsContent value="groups" className="space-y-2 max-h-60 overflow-y-auto">
                              {courseGroups?.map((group) => {
                                const coursesInGroup = (group.course_group_courses as any[])?.length || 0;
                                return (
                                  <div
                                    key={group.id}
                                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50"
                                  >
                                    <Checkbox
                                      id={`group-${group.id}`}
                                      checked={selectedGroupIds.includes(group.id)}
                                      onCheckedChange={() => toggleGroup(group.id)}
                                    />
                                    <label
                                      htmlFor={`group-${group.id}`}
                                      className="flex-1 cursor-pointer"
                                    >
                                      <span className="text-sm font-medium">{group.name}</span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({coursesInGroup} courses)
                                      </span>
                                    </label>
                                  </div>
                                );
                              })}
                              {(!courseGroups || courseGroups.length === 0) && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No course groups available
                                </p>
                              )}
                            </TabsContent>
                          </Tabs>
                          <div className="pt-4 space-y-3">
                            {selectedCount > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {selectedCourseIds.length} course(s) and {selectedGroupIds.length} group(s) selected
                              </p>
                            )}
                            <Button
                              onClick={handleEnroll}
                              disabled={selectedCount === 0 || enrollMutation.isPending}
                              className="w-full"
                            >
                              {enrollMutation.isPending ? 'Enrolling...' : 'Enroll User'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) setEditingUser(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>
              <Button
                onClick={() => updateUserMutation.mutate({
                  userId: editingUser.id,
                  fullName: editingUser.full_name,
                  email: editingUser.email,
                })}
                disabled={updateUserMutation.isPending}
                className="w-full"
              >
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}