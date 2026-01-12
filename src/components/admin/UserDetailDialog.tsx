import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { Mail, MailX, Send, User, Shield, Eye, EyeOff, Calendar, Tag, BookOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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

  const isSubscribed = emailSubscription?.is_subscribed !== false;

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
    } else if (user) {
      setEditName(user.full_name || '');
      setEditEmail(user.email);
    }
    onOpenChange(newOpen);
  };

  if (!user) return null;

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
            <div>
              <div className="font-semibold">{user.full_name || 'No name'}</div>
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

              {/* Tags */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="font-medium">Tags ({userTags.length})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {userTags.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No tags assigned</span>
                  ) : (
                    userTags.map((ut) => (
                      <Badge key={ut.id} variant="secondary" className="text-xs">
                        {ut.email_tags?.name || 'Unknown'}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <Separator />

              {/* Enrollments */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">Course Enrollments ({userEnrollments.length})</span>
                </div>
                <div className="space-y-1">
                  {userEnrollments.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Not enrolled in any courses</span>
                  ) : (
                    userEnrollments.map((e) => (
                      <div key={e.course_id} className="text-sm py-1 px-2 bg-muted/50 rounded">
                        {(e.courses as any)?.title || 'Unknown course'}
                      </div>
                    ))
                  )}
                </div>
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
    </Dialog>
  );
}
