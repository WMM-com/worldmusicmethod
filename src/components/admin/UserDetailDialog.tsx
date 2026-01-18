import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Mail, MailX, Send, User, Shield, Eye, EyeOff, Tag, BookOpen, X, Plus, CreditCard, Search, BarChart3 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArtistDashboardAccessDialog } from './ArtistDashboardAccessDialog';
import { format } from 'date-fns';

type AppRole = 'user' | 'admin';

interface UserDetailDialogProps {
  user: {
    id: string;
    full_name: string | null;
    email: string;
    bio?: string | null;
    is_public?: boolean;
    created_at: string;
    avatar_url?: string | null;
    business_name?: string | null;
    username?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: AppRole;
  userEnrollments: { course_id: string; courses: { title: string } | null }[];
  userTags: { id: string; tag_id: string; email_tags: { name: string } | null }[];
  emailSubscription: { is_subscribed: boolean; unsubscribe_reason?: string | null; unsubscribed_at?: string | null } | undefined;
  onRoleChange: (userId: string, role: AppRole) => void;
  onSubscriptionChange: (email: string, isSubscribed: boolean) => void;
}

export function UserDetailDialog({
  user,
  open,
  onOpenChange,
  userRole,
  userEnrollments,
  userTags,
  emailSubscription,
  onRoleChange,
  onSubscriptionChange,
}: UserDetailDialogProps) {
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  
  // Direct email state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Tag management
  const [tagSearch, setTagSearch] = useState('');

  // Enrollment management
  const [enrollSearch, setEnrollSearch] = useState('');

  // Artist dashboard access dialog
  const [artistAccessDialogOpen, setArtistAccessDialogOpen] = useState(false);

  const isSubscribed = emailSubscription?.is_subscribed !== false;

  // Fetch all tags
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

  // Fetch all courses
  const { data: allCourses } = useQuery({
    queryKey: ['admin-courses-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('id, title').order('title');
      if (error) throw error;
      return data;
    },
  });

  // Fetch course groups
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

  // Fetch active subscription for this user
  const { data: activeSubscription } = useQuery({
    queryKey: ['admin-user-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, status, product_name, current_period_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch artist dashboard access for this user
  const { data: userArtistAccess = [] } = useQuery({
    queryKey: ['admin-user-artist-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('artist_dashboard_access')
        .select('artist_id, media_artists(name)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
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
      setEditingProfile(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user');
    },
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: async ({ userId, isPublic }: { userId: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_public: isPublic })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Profile visibility updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update visibility');
    },
  });

  // Add tag mutation
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
        toast.error('Tag already assigned');
      } else {
        toast.error(error.message || 'Failed to add tag');
      }
    },
  });

  // Remove tag mutation
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

  // Add enrollment mutation
  const addEnrollmentMutation = useMutation({
    mutationFn: async ({ userId, courseId }: { userId: string; courseId: string }) => {
      const currentUser = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from('course_enrollments').insert({
        user_id: userId,
        course_id: courseId,
        enrollment_type: 'manual',
        enrolled_by: currentUser?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
      toast.success('Enrolled in course');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate') || error.code === '23505') {
        toast.error('Already enrolled');
      } else {
        toast.error(error.message || 'Failed to enroll');
      }
    },
  });

  // Remove enrollment mutation
  const removeEnrollmentMutation = useMutation({
    mutationFn: async ({ userId, courseId }: { userId: string; courseId: string }) => {
      const { error } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
      toast.success('Enrollment removed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove enrollment');
    },
  });

  // Enroll in course group
  const enrollInGroupMutation = useMutation({
    mutationFn: async ({ userId, groupId }: { userId: string; groupId: string }) => {
      const group = courseGroups?.find(g => g.id === groupId);
      if (!group) throw new Error('Group not found');

      const courseIds = (group.course_group_courses as any[])?.map(c => c.course_id) || [];
      const existingIds = userEnrollments.map(e => e.course_id);
      const newIds = courseIds.filter(id => !existingIds.includes(id));

      if (newIds.length === 0) {
        throw new Error('Already enrolled in all courses in this group');
      }

      const currentUser = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from('course_enrollments').insert(
        newIds.map(courseId => ({
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
      toast.success('Enrolled in course group');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to enroll in group');
    },
  });

  const handleResetPassword = async () => {
    if (!user || !editPassword) return;
    setResettingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId: user.id, newPassword: editPassword },
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
  };

  const handleSendEmail = async () => {
    if (!user || !emailSubject || !emailBody) {
      toast.error('Please enter subject and message');
      return;
    }

    setSendingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-direct-email', {
        body: {
          to: user.email,
          subject: emailSubject,
          body: emailBody,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Email sent successfully');
      setEmailSubject('');
      setEmailBody('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditingProfile(false);
      setEditPassword('');
      setEmailSubject('');
      setEmailBody('');
      setTagSearch('');
      setEnrollSearch('');
    } else if (user) {
      setEditName(user.full_name || '');
      setEditEmail(user.email);
    }
    onOpenChange(newOpen);
  };

  if (!user) return null;

  const currentTagIds = userTags.map(ut => ut.tag_id);
  const enrolledCourseIds = userEnrollments.map(e => e.course_id);

  const filteredTags = allTags?.filter(tag =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase()) && !currentTagIds.includes(tag.id)
  ) || [];

  const filteredCourses = allCourses?.filter(course =>
    course.title.toLowerCase().includes(enrollSearch.toLowerCase()) && !enrolledCourseIds.includes(course.id)
  ) || [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <div className="font-semibold flex items-center gap-2">
                {user.full_name || 'No name'}
                {activeSubscription && (
                  <Badge className="bg-green-600 text-white text-xs">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Active Subscriber
                  </Badge>
                )}
              </div>
              <div className="text-sm font-normal text-muted-foreground">{user.email}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="access">Access & Enrollments</TabsTrigger>
            <TabsTrigger value="email">Send Email</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="details" className="m-0 space-y-4">
              {/* Profile Info */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Username:</span>
                    <span className="ml-2 font-medium">{user.username || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Business:</span>
                    <span className="ml-2 font-medium">{user.business_name || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Joined:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Profile Visibility:</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.is_public || false}
                        onCheckedChange={(checked) => updateVisibilityMutation.mutate({ userId: user.id, isPublic: checked })}
                      />
                      <span className="text-sm">{user.is_public ? 'Public' : 'Private'}</span>
                      {user.is_public ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </div>

                {/* Active Subscription Info */}
                {activeSubscription && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CreditCard className="h-4 w-4" />
                      <span className="font-medium">Active Subscription</span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                      {activeSubscription.product_name || 'Subscription'} • Renews {format(new Date(activeSubscription.current_period_end), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}

                {user.bio && (
                  <div>
                    <span className="text-muted-foreground text-sm">Bio:</span>
                    <p className="text-sm mt-1">{user.bio}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Email Subscription */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSubscribed ? (
                      <Mail className="h-4 w-4 text-green-600" />
                    ) : (
                      <MailX className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-medium">Email Subscription</span>
                  </div>
                  <Button
                    size="sm"
                    variant={isSubscribed ? "destructive" : "default"}
                    onClick={() => onSubscriptionChange(user.email, !isSubscribed)}
                  >
                    {isSubscribed ? 'Unsubscribe' : 'Resubscribe'}
                  </Button>
                </div>
                {emailSubscription?.unsubscribe_reason && (
                  <div className="text-xs bg-muted p-2 rounded">
                    <p><span className="font-medium">Reason:</span> {emailSubscription.unsubscribe_reason}</p>
                    {emailSubscription.unsubscribed_at && (
                      <p className="text-muted-foreground mt-1">
                        On: {format(new Date(emailSubscription.unsubscribed_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Edit Profile */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Edit Profile</span>
                  {!editingProfile && (
                    <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>
                      Edit
                    </Button>
                  )}
                </div>

                {editingProfile && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="edit-name" className="text-xs">Full Name</Label>
                      <Input
                        id="edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-email" className="text-xs">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateUserMutation.mutate({
                          userId: user.id,
                          fullName: editName,
                          email: editEmail,
                        })}
                        disabled={updateUserMutation.isPending}
                      >
                        {updateUserMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Reset Password</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="New password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="h-9"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resettingPassword || !editPassword}
                      onClick={handleResetPassword}
                    >
                      {resettingPassword ? 'Resetting...' : 'Reset'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="access" className="m-0 space-y-4">
              {/* Role */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">User Role</span>
                </div>
                <Select
                  value={userRole}
                  onValueChange={(value: AppRole) => onRoleChange(user.id, value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Artist Dashboard Access */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium">Artist Dashboard Access</span>
                  {userArtistAccess.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {userArtistAccess.length} artist{userArtistAccess.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setArtistAccessDialogOpen(true)}
                >
                  Manage
                </Button>
              </div>

              <Separator />

              {/* Tags Management */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="font-medium">Tags ({userTags.length})</span>
                </div>
                
                {/* Current tags with remove button */}
                <div className="flex flex-wrap gap-1">
                  {userTags.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No tags assigned</span>
                  ) : (
                    userTags.map((ut) => (
                      <Badge key={ut.id} variant="secondary" className="text-xs gap-1 pr-1">
                        {ut.email_tags?.name || 'Unknown'}
                        <button
                          onClick={() => removeTagMutation.mutate({ userId: user.id, tagId: ut.tag_id })}
                          className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>

                {/* Add tag search */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search tags to add..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      className="h-8 pl-7 text-xs"
                    />
                  </div>
                  {tagSearch && filteredTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-auto">
                      {filteredTags.slice(0, 10).map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => {
                            addTagMutation.mutate({ userId: user.id, email: user.email, tagId: tag.id });
                            setTagSearch('');
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Enrollments Management */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">Course Enrollments ({userEnrollments.length})</span>
                </div>

                {/* Current enrollments with remove button */}
                <div className="space-y-1 max-h-32 overflow-auto">
                  {userEnrollments.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Not enrolled in any courses</span>
                  ) : (
                    userEnrollments.map((e) => (
                      <div key={e.course_id} className="text-sm py-1 px-2 bg-muted/50 rounded flex items-center justify-between">
                        <span>{(e.courses as any)?.title || 'Unknown course'}</span>
                        <button
                          onClick={() => removeEnrollmentMutation.mutate({ userId: user.id, courseId: e.course_id })}
                          className="text-destructive hover:bg-destructive/20 rounded p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add course search */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search courses to add..."
                      value={enrollSearch}
                      onChange={(e) => setEnrollSearch(e.target.value)}
                      className="h-8 pl-7 text-xs"
                    />
                  </div>
                  {enrollSearch && filteredCourses.length > 0 && (
                    <div className="space-y-1 max-h-24 overflow-auto">
                      {filteredCourses.slice(0, 5).map((course) => (
                        <div
                          key={course.id}
                          className="text-xs py-1 px-2 bg-muted/30 rounded cursor-pointer hover:bg-primary/10 flex items-center gap-2"
                          onClick={() => {
                            addEnrollmentMutation.mutate({ userId: user.id, courseId: course.id });
                            setEnrollSearch('');
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          {course.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Course groups quick enroll */}
                {courseGroups && courseGroups.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Quick enroll by group:</Label>
                    <div className="flex flex-wrap gap-1">
                      {courseGroups.map((group: any) => (
                        <Badge
                          key={group.id}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => enrollInGroupMutation.mutate({ userId: user.id, groupId: group.id })}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {group.name} ({group.course_group_courses?.length || 0})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="email" className="m-0 space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Send a direct email to {user.full_name || user.email}
                </p>
                <div className="space-y-1">
                  <Label htmlFor="email-subject" className="text-xs">Subject</Label>
                  <Input
                    id="email-subject"
                    placeholder="Email subject..."
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email-body" className="text-xs">Message</Label>
                  <Textarea
                    id="email-body"
                    placeholder="Type your message..."
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="min-h-[150px]"
                  />
                </div>
                <Button
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !emailSubject || !emailBody}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>

      {/* Artist Dashboard Access Dialog */}
      <ArtistDashboardAccessDialog
        user={user}
        open={artistAccessDialogOpen}
        onOpenChange={setArtistAccessDialogOpen}
        currentAccess={userArtistAccess}
      />
    </Dialog>
  );
}
