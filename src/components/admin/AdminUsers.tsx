import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeSearchQuery } from '@/lib/sanitize';
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
import { Search, BookOpen, UserPlus, Users, Pencil, RefreshCw, Trash2, Upload, Tag, X, Plus, Mail, MailX } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [editPassword, setEditPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  // New user form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  
  // WordPress import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJsonData, setImportJsonData] = useState('');
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  // Tags management state
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [tagsUserId, setTagsUserId] = useState<string | null>(null);
  const [tagsUserEmail, setTagsUserEmail] = useState<string>('');
  const [tagSearch, setTagSearch] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        const safeQuery = sanitizeSearchQuery(searchQuery);
        query = query.or(`email.ilike.%${safeQuery}%,full_name.ilike.%${safeQuery}%`);
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
      const { data, error } = await supabase.from('courses').select('id, title, tags').order('title');
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

  // Fetch all available tags
  const { data: allTags } = useQuery({
    queryKey: ['admin-email-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_tags')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch user tags
  const { data: userTags } = useQuery({
    queryKey: ['admin-user-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_tags')
        .select('*, email_tags(id, name)');
      if (error) throw error;
      return data;
    },
  });

  // Fetch email contacts for subscription status
  const { data: emailContacts } = useQuery({
    queryKey: ['admin-email-contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_contacts')
        .select('email, is_subscribed, unsubscribe_reason, unsubscribed_at');
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

  // Add tag to user mutation
  const addTagMutation = useMutation({
    mutationFn: async ({ userId, email, tagId }: { userId: string; email: string; tagId: string }) => {
      const { error } = await supabase.from('user_tags').insert({
        user_id: userId,
        email: email,
        tag_id: tagId,
        source: 'admin',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-tags'] });
      toast.success('Tag added');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate') || error.code === '23505') {
        toast.error('Tag already assigned to this user');
      } else {
        toast.error(error.message || 'Failed to add tag');
      }
    },
  });

  // Remove tag from user mutation
  const removeTagMutation = useMutation({
    mutationFn: async ({ userId, tagId }: { userId: string; tagId: string }) => {
      const { error } = await supabase
        .from('user_tags')
        .delete()
        .eq('user_id', userId)
        .eq('tag_id', tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-tags'] });
      toast.success('Tag removed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove tag');
    },
  });

  // Update email subscription mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ email, isSubscribed }: { email: string; isSubscribed: boolean }) => {
      // Check if contact exists
      const { data: existing } = await supabase
        .from('email_contacts')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('email_contacts')
          .update({ 
            is_subscribed: isSubscribed,
            unsubscribed_at: isSubscribed ? null : new Date().toISOString(),
            unsubscribe_reason: isSubscribed ? null : 'Admin action'
          })
          .eq('email', email.toLowerCase());
        if (error) throw error;
      } else {
        // Create new contact
        const { error } = await supabase
          .from('email_contacts')
          .insert({ 
            email: email.toLowerCase(),
            is_subscribed: isSubscribed,
            source: 'admin'
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-contacts'] });
      toast.success('Email subscription updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update subscription');
    },
  });

  const getUserRole = (userId: string): AppRole => {
    const role = userRoles?.find(r => r.user_id === userId);
    return (role?.role as AppRole) || 'user';
  };

  const getUserEnrollments = (userId: string) => {
    return enrollments?.filter(e => e.user_id === userId) || [];
  };

  const getUserTags = (userId: string) => {
    return userTags?.filter(ut => ut.user_id === userId) || [];
  };

  const getEmailSubscription = (email: string) => {
    return emailContacts?.find(ec => ec.email?.toLowerCase() === email?.toLowerCase());
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

  const [syncing, setSyncing] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const handleSyncEmails = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-profile-emails');
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('Emails synced successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync emails');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

  const selectedCount = selectedCourseIds.length + selectedGroupIds.length;

  const handlePreviewImport = async () => {
    if (!importJsonData.trim()) {
      toast.error('Please paste the WordPress users JSON data');
      return;
    }

    try {
      let users;
      try {
        users = JSON.parse(importJsonData);
        if (!Array.isArray(users)) {
          users = [users];
        }
      } catch (e) {
        toast.error('Invalid JSON format');
        return;
      }

      setImporting(true);
      const { data, error } = await supabase.functions.invoke('import-wordpress-users', {
        body: { users, mode: 'preview' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setImportPreview(data.results);
      toast.success(data.message);
    } catch (error: any) {
      toast.error(error.message || 'Failed to preview import');
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importJsonData.trim()) {
      toast.error('Please paste the WordPress users JSON data');
      return;
    }

    try {
      let users;
      try {
        users = JSON.parse(importJsonData);
        if (!Array.isArray(users)) {
          users = [users];
        }
      } catch (e) {
        toast.error('Invalid JSON format');
        return;
      }

      setImporting(true);
      const { data, error } = await supabase.functions.invoke('import-wordpress-users', {
        body: { users, mode: 'import' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-tags'] });
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
      setImportDialogOpen(false);
      setImportJsonData('');
      setImportPreview(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import users');
    } finally {
      setImporting(false);
    }
  };

  // Get filtered tags for the tags dialog
  const filteredTags = allTags?.filter(tag => 
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  ) || [];

  const currentUserTags = tagsUserId ? getUserTags(tagsUserId) : [];
  const currentUserTagIds = currentUserTags.map(ut => ut.tag_id);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Users
        </CardTitle>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleSyncEmails} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Emails
          </Button>
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
          
          {/* WordPress Import Dialog */}
          <Dialog open={importDialogOpen} onOpenChange={(open) => {
            setImportDialogOpen(open);
            if (!open) {
              setImportJsonData('');
              setImportPreview(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import WP Users
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import WordPress Users</DialogTitle>
                <DialogDescription>
                  Paste WordPress user data as JSON. Users will be created with random passwords, marked as private, and email-verified.
                  Include tags array to auto-assign tags and enroll in matching courses.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>User JSON Data</Label>
                  <Textarea
                    placeholder={`[
  {
    "email": "user@example.com", 
    "display_name": "John Doe", 
    "user_pass": "$P$...",
    "tags": ["DGO", "Student", "Guitarist"]
  },
  ...
]`}
                    value={importJsonData}
                    onChange={(e) => setImportJsonData(e.target.value)}
                    className="font-mono text-xs min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Expected fields: email/user_email, display_name/name, user_pass/password_hash (optional), tags (optional array)
                  </p>
                </div>
                
                {importPreview && (
                  <div className="border rounded-lg p-4 max-h-[200px] overflow-auto">
                    <h4 className="font-medium mb-2">Preview Results</h4>
                    <div className="space-y-1 text-sm">
                      {importPreview.preview?.map((user: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <Badge variant={user.status === 'will_create' ? 'default' : 'outline'}>
                            {user.status}
                          </Badge>
                          <span>{user.email}</span>
                          <span className="text-muted-foreground">({user.name})</span>
                          {user.tags?.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              +{user.tags.length} tags
                            </span>
                          )}
                          {user.enrollments?.length > 0 && (
                            <span className="text-xs text-primary">
                              +{user.enrollments.length} courses
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {importPreview.errors?.length > 0 && (
                      <div className="mt-2 text-destructive">
                        {importPreview.errors.map((e: any, i: number) => (
                          <div key={i} className="text-xs">{e.email}: {e.error}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handlePreviewImport} 
                    disabled={importing || !importJsonData.trim()}
                    className="flex-1"
                  >
                    {importing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Preview
                  </Button>
                  <Button 
                    onClick={handleConfirmImport} 
                    disabled={importing || !importJsonData.trim()}
                    className="flex-1"
                  >
                    {importing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Import Users
                  </Button>
                </div>
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
              <TableHead>Email Subscribed</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Enrolled Courses</TableHead>
              <TableHead>Joined</TableHead>
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
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users?.map((user) => {
                const role = getUserRole(user.id);
                const userEnrollments = getUserEnrollments(user.id);
                const tags = getUserTags(user.id);
                const emailSub = getEmailSubscription(user.email);
                const isSubscribed = emailSub?.is_subscribed !== false; // Default to subscribed if no record
                
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`flex items-center gap-1 ${!isSubscribed ? 'text-destructive' : 'text-green-600'}`}
                          >
                            {isSubscribed ? (
                              <>
                                <Mail className="h-4 w-4" />
                                <span>Subscribed</span>
                              </>
                            ) : (
                              <>
                                <MailX className="h-4 w-4" />
                                <span>Unsubscribed</span>
                              </>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="start">
                          <div className="space-y-3">
                            <div className="text-sm">
                              <p className="font-medium">Email Subscription Status</p>
                              <p className="text-muted-foreground text-xs">
                                {isSubscribed 
                                  ? 'User will receive email campaigns' 
                                  : 'User has opted out of emails'}
                              </p>
                            </div>
                            {emailSub?.unsubscribe_reason && (
                              <div className="text-xs bg-muted p-2 rounded">
                                <p className="font-medium">Reason:</p>
                                <p className="text-muted-foreground">{emailSub.unsubscribe_reason}</p>
                                {emailSub.unsubscribed_at && (
                                  <p className="text-muted-foreground mt-1">
                                    On: {new Date(emailSub.unsubscribed_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant={isSubscribed ? "destructive" : "default"}
                              className="w-full"
                              disabled={updateSubscriptionMutation.isPending}
                              onClick={() => updateSubscriptionMutation.mutate({ 
                                email: user.email, 
                                isSubscribed: !isSubscribed 
                              })}
                            >
                              {updateSubscriptionMutation.isPending ? 'Updating...' : (
                                isSubscribed ? 'Unsubscribe User' : 'Resubscribe User'
                              )}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 items-center">
                        {tags.slice(0, 3).map((ut: any) => (
                          <Badge 
                            key={ut.id} 
                            variant="secondary" 
                            className="text-xs flex items-center gap-1"
                          >
                            {ut.email_tags?.name || 'Unknown'}
                            <button
                              onClick={() => removeTagMutation.mutate({ userId: user.id, tagId: ut.tag_id })}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{tags.length - 3} more
                          </Badge>
                        )}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setTagsUserId(user.id);
                                setTagsUserEmail(user.email);
                                setTagSearch('');
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2" align="start">
                            <div className="space-y-2">
                              <Input
                                placeholder="Search tags..."
                                value={tagSearch}
                                onChange={(e) => setTagSearch(e.target.value)}
                                className="h-8"
                              />
                              <ScrollArea className="h-48">
                                <div className="space-y-1">
                                  {filteredTags.map(tag => {
                                    const isAssigned = tags.some((ut: any) => ut.tag_id === tag.id);
                                    return (
                                      <Button
                                        key={tag.id}
                                        variant={isAssigned ? "secondary" : "ghost"}
                                        size="sm"
                                        className="w-full justify-start text-xs h-7"
                                        disabled={isAssigned || addTagMutation.isPending}
                                        onClick={() => addTagMutation.mutate({ 
                                          userId: user.id, 
                                          email: user.email,
                                          tagId: tag.id 
                                        })}
                                      >
                                        <Tag className="h-3 w-3 mr-2" />
                                        {tag.name}
                                        {isAssigned && <span className="ml-auto text-muted-foreground">✓</span>}
                                      </Button>
                                    );
                                  })}
                                  {filteredTags.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-2">
                                      No tags found
                                    </p>
                                  )}
                                </div>
                              </ScrollArea>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
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
                                      className={`text-sm flex-1 cursor-pointer ${isEnrolled ? 'text-muted-foreground' : ''}`}
                                    >
                                      {course.title}
                                      {isEnrolled && <span className="ml-2 text-xs">(enrolled)</span>}
                                    </label>
                                  </div>
                                );
                              })}
                            </TabsContent>
                            <TabsContent value="groups" className="space-y-2 max-h-60 overflow-y-auto">
                              {courseGroups?.map((group: any) => (
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
                                    className="text-sm flex-1 cursor-pointer"
                                  >
                                    {group.name}
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({group.course_group_courses?.length || 0} courses)
                                    </span>
                                  </label>
                                </div>
                              ))}
                            </TabsContent>
                          </Tabs>
                          <div className="flex justify-between items-center pt-4 border-t">
                            <span className="text-sm text-muted-foreground">
                              {selectedCount} selected
                            </span>
                            <Button
                              onClick={handleEnroll}
                              disabled={enrollMutation.isPending || selectedCount === 0}
                            >
                              {enrollMutation.isPending ? 'Enrolling...' : 'Enroll User'}
                            </Button>
                          </div>
                        </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={deletingUserId === user.id || role === 'admin'}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription className="text-left">
                                Are you sure you want to delete {user.full_name || user.email}? This will permanently remove:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>All posts, comments, and group activity</li>
                                  <li>All uploaded files from cloud storage (R2)</li>
                                  <li>Profile images, gallery, and media library items</li>
                                  <li>Course enrollments and progress</li>
                                  <li>Messages, conversations, and notifications</li>
                                  <li>Financial records (invoices, expenses, contracts)</li>
                                </ul>
                                <p className="mt-3 font-semibold text-destructive">This action cannot be undone. All data and files will be permanently deleted.</p>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingUser?.full_name || ''}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser?.email || ''}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                />
              </div>
              <Button
                onClick={() => {
                  if (editingUser) {
                    updateUserMutation.mutate({
                      userId: editingUser.id,
                      fullName: editingUser.full_name,
                      email: editingUser.email,
                    });
                  }
                }}
                disabled={updateUserMutation.isPending}
                className="w-full"
              >
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              
              <div className="border-t pt-4 mt-4">
                <Label htmlFor="new-password" className="mb-2 block">Reset Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="New password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    disabled={resettingPassword || !editPassword}
                    onClick={async () => {
                      if (!editingUser || !editPassword) return;
                      setResettingPassword(true);
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) {
                          toast.error('You must be logged in');
                          return;
                        }

                        const { data, error } = await supabase.functions.invoke('admin-reset-password', {
                          body: { userId: editingUser.id, newPassword: editPassword },
                        });

                        if (error) throw error;
                        if (data?.error) throw new Error(data.error);

                        toast.success('Password reset successfully');
                        setEditPassword('');
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to reset password');
                      } finally {
                        setResettingPassword(false);
                      }
                    }}
                  >
                    {resettingPassword ? 'Resetting...' : 'Reset'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
