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
import { Search, BookOpen, UserPlus, Users, RefreshCw, Trash2, Upload, X, Plus, Mail, MailX, Tag, Pencil } from 'lucide-react';
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
import { UserDetailDialog } from './UserDetailDialog';
import { TestEmailDialog } from './TestEmailDialog';
import { format } from 'date-fns';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

type AppRole = 'user' | 'admin';

const USERS_PER_PAGE = 50;

export function AdminUsers() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
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

  // CSV import state
  const [csvImportDialogOpen, setCsvImportDialogOpen] = useState(false);
  const [csvImportPreview, setCsvImportPreview] = useState<any>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvStudents, setCsvStudents] = useState<any[]>([]);
  const [repairingTags, setRepairingTags] = useState(false);

  // Tags management state
  const [tagsUserId, setTagsUserId] = useState<string | null>(null);
  const [tagsUserEmail, setTagsUserEmail] = useState<string>('');
  const [tagSearch, setTagSearch] = useState('');

  // User detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<any>(null);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Fetch total count for pagination using server-side function
  const { data: totalCount } = useQuery({
    queryKey: ['admin-users-count', searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_count_profiles', {
        search_term: searchQuery || '',
      });
      if (error) throw error;
      return (data as number) || 0;
    },
  });

  const totalPages = Math.ceil((totalCount || 0) / USERS_PER_PAGE);

  const { data: users, isLoading, error: usersError } = useQuery({
    queryKey: ['admin-users', searchQuery, currentPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * USERS_PER_PAGE;

      const { data, error } = await supabase.rpc('admin_search_profiles', {
        search_term: searchQuery || '',
        page_offset: offset,
        page_limit: USERS_PER_PAGE,
      });
      if (error) {
        console.error('Admin users query failed:', { error, searchQuery });
        throw new Error(`Query failed: ${error.message}`);
      }
      console.log(`Admin users query returned ${data?.length ?? 0} results (page ${currentPage}, search: "${searchQuery}")`);
      return data;
    },
    retry: 1,
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

  // Fetch enrollments for displayed users only (avoid 1000 row limit issue)
  const userIds = users?.map(u => u.id) || [];
  
  // Fetch roles for displayed users only (avoid 1000 row limit issue)
  const { data: userRoles, refetch: refetchRoles } = useQuery({
    queryKey: ['admin-user-roles', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .in('user_id', userIds);
      if (error) throw error;
      return data;
    },
    enabled: userIds.length > 0,
  });

  const { data: enrollments } = useQuery({
    queryKey: ['admin-enrollments', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('user_id, course_id, courses(title)')
        .in('user_id', userIds);
      if (error) throw error;
      return data;
    },
    enabled: userIds.length > 0,
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

  // Fetch user tags for displayed users only (avoid 1000 row limit issue)
  const { data: userTags } = useQuery({
    queryKey: ['admin-user-tags', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from('user_tags')
        .select('*, email_tags(id, name)')
        .in('user_id', userIds);
      if (error) throw error;
      return data;
    },
    enabled: userIds.length > 0,
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
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error('Error deleting existing role:', deleteError);
        // Continue anyway - user might not have a role yet
      }
      
      // Then insert new role - cast to any to handle enum type
      const { error: insertError } = await supabase.from('user_roles').insert([{
        user_id: userId,
        role: role as any,
      }]);
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      // Force immediate refetch of roles for current users
      refetchRoles();
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
      toast.success('User role updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update role');
    },
  });

  // Handler for role change from detail dialog
  const handleRoleChange = (userId: string, role: AppRole) => {
    updateRoleMutation.mutate({ userId, role });
  };

  // Handler for subscription change from detail dialog
  const handleSubscriptionChange = (email: string, isSubscribed: boolean) => {
    updateSubscriptionMutation.mutate({ email, isSubscribed });
  };

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

  // CSV Import handlers
  const handleCsvFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      
      const students: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV line handling quoted values
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        
        const row: any = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        
        students.push({
          firstName: row['first name'] || row['firstname'] || '',
          lastName: row['last name'] || row['lastname'] || '',
          email: row['email'] || '',
          tags: row['tags'] || '',
        });
      }
      
      setCsvStudents(students);
      setCsvImportDialogOpen(true);
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const handleCsvPreviewImport = async () => {
    if (csvStudents.length === 0) {
      toast.error('No students loaded');
      return;
    }

    setCsvImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-student-contacts', {
        body: { students: csvStudents, mode: 'preview' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCsvImportPreview(data.results);
      toast.success(data.message);
    } catch (error: any) {
      toast.error(error.message || 'Failed to preview import');
    } finally {
      setCsvImporting(false);
    }
  };

  const handleCsvConfirmImport = async () => {
    if (csvStudents.length === 0) {
      toast.error('No students loaded');
      return;
    }

    setCsvImporting(true);
    try {
      // Process in batches for large imports
      const batchSize = 200;
      let totalUpdated = 0;
      let totalEnrolled = 0;
      let totalSkipped = 0;
      
      const batches = [];
      for (let i = 0; i < csvStudents.length; i += batchSize) {
        batches.push(csvStudents.slice(i, i + batchSize));
      }
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        toast.info(`Processing batch ${i + 1} of ${batches.length}...`);
        
        const { data, error } = await supabase.functions.invoke('import-student-contacts', {
          body: { students: batch, mode: 'import' }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        totalUpdated += data.updatedProfiles || 0;
        totalEnrolled += data.createdEnrollments || 0;
        totalSkipped += data.skippedNoMatch || 0;
      }

      toast.success(`Import complete: ${totalUpdated} profiles updated, ${totalEnrolled} enrollments created, ${totalSkipped} not found`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
      setCsvImportDialogOpen(false);
      setCsvStudents([]);
      setCsvImportPreview(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import students');
    } finally {
      setCsvImporting(false);
    }
  };

  // Repair tags from CSV - fetches student-contacts.csv and syncs to user_tags
  const handleRepairTags = async () => {
    if (repairingTags) return;
    
    setRepairingTags(true);
    try {
      toast.info('Fetching student contacts CSV...');
      
      // Fetch the CSV file from public assets
      const response = await fetch('/assets/data/student-contacts.csv');
      if (!response.ok) {
        throw new Error('Failed to fetch student contacts CSV');
      }
      const csvContent = await response.text();
      
      toast.info(`Loaded CSV, sending to repair function...`);
      
      const { data, error } = await supabase.functions.invoke('repair-tags-from-csv', {
        body: { csvContent }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success(
        `Tag repair complete: ${data.matched_profiles} matched, ${data.user_tags_created} tags created, ${data.unmatched_count} unmatched`
      );
      
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-tags'] });
    } catch (error: any) {
      console.error('Repair tags error:', error);
      toast.error(error.message || 'Failed to repair tags');
    } finally {
      setRepairingTags(false);
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
      <CardHeader className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users
          </CardTitle>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRepairTags} disabled={repairingTags}>
            <Tag className={`h-4 w-4 mr-2 ${repairingTags ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{repairingTags ? 'Repairing Tags...' : 'Repair Tags'}</span>
            <span className="sm:hidden">{repairingTags ? 'Repairing...' : 'Tags'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleSyncEmails} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Emails</span>
            <span className="sm:hidden">Sync</span>
          </Button>
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

          {/* CSV Import Button */}
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </div>

          {/* CSV Import Dialog */}
          <Dialog open={csvImportDialogOpen} onOpenChange={(open) => {
            setCsvImportDialogOpen(open);
            if (!open) {
              setCsvStudents([]);
              setCsvImportPreview(null);
            }
          }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Import Students from CSV</DialogTitle>
                <DialogDescription>
                  Import students with course enrollments. Users with "Member" tag get access to all courses in "Access All Courses" group.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4 flex-1 overflow-hidden flex flex-col">
                <div className="text-sm">
                  <strong>{csvStudents.length}</strong> students loaded from CSV
                </div>
                
                {csvImportPreview ? (
                  <ScrollArea className="flex-1 border rounded-lg">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Preview Results</h4>
                        <div className="text-sm text-muted-foreground">
                          {csvImportPreview.preview?.filter((p: any) => p.status === 'will_create').length || 0} new • 
                          {csvImportPreview.preview?.filter((p: any) => p.status === 'exists').length || 0} existing • 
                          {csvImportPreview.preview?.filter((p: any) => p.isMember).length || 0} members
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        {csvImportPreview.preview?.slice(0, 100).map((user: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 py-1 border-b border-border/50">
                            <Badge variant={user.status === 'will_create' ? 'default' : 'outline'} className="text-xs shrink-0">
                              {user.status === 'will_create' ? 'new' : user.status}
                            </Badge>
                            {user.isMember && (
                              <Badge variant="secondary" className="text-xs shrink-0">Member</Badge>
                            )}
                            <span className="truncate flex-1">{user.email}</span>
                            <span className="text-muted-foreground text-xs shrink-0">({user.name})</span>
                            {user.enrollments?.length > 0 && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {user.enrollments.length} courses
                              </Badge>
                            )}
                          </div>
                        ))}
                        {csvImportPreview.preview?.length > 100 && (
                          <div className="text-center text-muted-foreground py-2">
                            ... and {csvImportPreview.preview.length - 100} more
                          </div>
                        )}
                      </div>
                      {csvImportPreview.errors?.length > 0 && (
                        <div className="mt-4 p-2 bg-destructive/10 rounded text-destructive">
                          <h5 className="font-medium mb-1">Errors ({csvImportPreview.errors.length})</h5>
                          {csvImportPreview.errors.map((e: any, i: number) => (
                            <div key={i} className="text-xs">{e.email}: {e.error}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <ScrollArea className="flex-1 border rounded-lg">
                    <div className="p-4">
                      <h4 className="font-medium mb-2">Students to Import (first 50)</h4>
                      <div className="space-y-1 text-sm">
                        {csvStudents.slice(0, 50).map((student, i) => (
                          <div key={i} className="flex items-center gap-2 py-1 border-b border-border/50">
                            <span className="truncate">{student.email}</span>
                            <span className="text-muted-foreground text-xs">
                              ({student.firstName} {student.lastName})
                            </span>
                            {student.tags && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {student.tags}
                              </span>
                            )}
                          </div>
                        ))}
                        {csvStudents.length > 50 && (
                          <div className="text-center text-muted-foreground py-2">
                            ... and {csvStudents.length - 50} more
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCsvPreviewImport} 
                    disabled={csvImporting || csvStudents.length === 0}
                    className="flex-1"
                  >
                    {csvImporting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Preview Import
                  </Button>
                  <Button 
                    onClick={handleCsvConfirmImport} 
                    disabled={csvImporting || csvStudents.length === 0 || !csvImportPreview}
                    className="flex-1"
                  >
                    {csvImporting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Import All Students
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">User</TableHead>
              <TableHead className="w-[70px]">Role</TableHead>
              <TableHead className="w-[50px]">Email</TableHead>
              <TableHead className="w-[70px]">Tags</TableHead>
              <TableHead className="w-[80px]">Courses</TableHead>
              <TableHead className="w-[100px]">Joined</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : usersError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-destructive">
                  Error loading users: {usersError.message}
                  <button 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
                    className="ml-2 underline hover:no-underline"
                  >
                    Retry
                  </button>
                </TableCell>
              </TableRow>
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found{searchQuery ? ` matching "${searchQuery}"` : ''}
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
                  <TableRow 
                    key={user.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setDetailUser(user);
                      setDetailDialogOpen(true);
                    }}
                  >
                    <TableCell className="py-2">
                      <div className="max-w-[180px]">
                        <p className="font-medium text-sm truncate">{user.full_name || 'No name'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                      <Badge variant={getRoleBadgeVariant(role)} className="text-xs">
                        {role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                      {isSubscribed ? (
                        <Mail className="h-4 w-4 text-green-600" />
                      ) : (
                        <MailX className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {tags.length > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          {tags.length} tag{tags.length !== 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {userEnrollments.length > 0 ? (
                        <Badge variant="outline" className="text-xs">
                          {userEnrollments.length} course{userEnrollments.length !== 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-2">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <TestEmailDialog userEmail={user.email} userName={user.full_name || ''} />
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
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setEnrollDialogOpen(true);
                              }}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * USERS_PER_PAGE) + 1} - {Math.min(currentPage * USERS_PER_PAGE, totalCount || 0)} of {totalCount} users
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {/* First page */}
                {currentPage > 2 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">
                      1
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {currentPage > 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                
                {/* Previous page */}
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setCurrentPage(currentPage - 1)} className="cursor-pointer">
                      {currentPage - 1}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {/* Current page */}
                <PaginationItem>
                  <PaginationLink isActive className="cursor-pointer">
                    {currentPage}
                  </PaginationLink>
                </PaginationItem>
                
                {/* Next page */}
                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setCurrentPage(currentPage + 1)} className="cursor-pointer">
                      {currentPage + 1}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                
                {/* Last page */}
                {currentPage < totalPages - 1 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* User Detail Dialog */}
        <UserDetailDialog
          user={detailUser}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          userRole={detailUser ? getUserRole(detailUser.id) : 'user'}
          userEnrollments={detailUser ? getUserEnrollments(detailUser.id) : []}
          userTags={detailUser ? getUserTags(detailUser.id) : []}
          emailSubscription={detailUser ? getEmailSubscription(detailUser.email) : undefined}
          onRoleChange={handleRoleChange}
          onSubscriptionChange={handleSubscriptionChange}
        />
      </CardContent>
    </Card>
  );
}
