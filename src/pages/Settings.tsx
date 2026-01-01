import { useState, useEffect } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarSettings } from '@/components/settings/CalendarSettings';
import { User, Bell, ShoppingBag, Calendar, Lock, AlertTriangle, Trash2 } from 'lucide-react';
import { UserOrders } from '@/components/account/UserOrders';
import { UserSubscriptions } from '@/components/account/UserSubscriptions';


export default function Settings() {
  const { profile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  
  // Account form
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);


  // Notification settings
  const [notifications, setNotifications] = useState({
    email_reminders: true,
    email_invoices: true,
    email_friend_requests: false,
    email_comments: false,
    email_mentions: false,
    push_events: true,
    push_messages: true,
  });

  // Message privacy settings
  const [messagePrivacy, setMessagePrivacy] = useState('community');

  // Sync form with profile when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
      });
      setMessagePrivacy(profile.message_privacy || 'community');
      // Load notification preferences from profile
      setNotifications({
        email_reminders: profile.notification_email_reminders ?? true,
        email_invoices: profile.notification_email_invoices ?? true,
        email_friend_requests: profile.notification_email_friend_requests ?? false,
        email_comments: profile.notification_email_comments ?? false,
        email_mentions: profile.notification_email_mentions ?? false,
        push_events: profile.notification_push_events ?? true,
        push_messages: profile.notification_push_messages ?? true,
      });
    }
  }, [profile]);

  const handleSaveAccount = async () => {
    setSaving(true);
    
    // Update profile (name fields)
    const { error } = await updateProfile({
      first_name: form.first_name,
      last_name: form.last_name,
      full_name: `${form.first_name} ${form.last_name}`.trim(),
    });
    
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Account settings saved');
    }
    setSaving(false);
  };

  const handleChangeEmail = async () => {
    if (!form.email || form.email === profile?.email) {
      toast.error('Please enter a new email address');
      return;
    }

    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({
      email: form.email,
    });

    if (error) {
      toast.error('Failed to update email: ' + error.message);
    } else {
      toast.success('Confirmation email sent to your new address. Please check your inbox.');
    }
    setChangingEmail(false);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    
    // First verify current password by signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email || '',
      password: passwordForm.currentPassword,
    });

    if (signInError) {
      toast.error('Current password is incorrect');
      setChangingPassword(false);
      return;
    }

    // Then update to new password
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });

    if (error) {
      toast.error('Failed to update password: ' + error.message);
    } else {
      toast.success('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
    setChangingPassword(false);
  };

  const handleRequestAccountDeletion = async () => {
    setRequestingDeletion(true);
    try {
      const { error } = await supabase.functions.invoke('request-account-deletion');
      if (error) throw error;
      setDeletionRequested(true);
      toast.success('Confirmation email sent. Please check your inbox to confirm account deletion.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to request account deletion');
    }
    setRequestingDeletion(false);
  };


  const handleSaveNotifications = async () => {
    const { error } = await updateProfile({ 
      message_privacy: messagePrivacy,
      notification_email_reminders: notifications.email_reminders,
      notification_email_invoices: notifications.email_invoices,
      notification_email_friend_requests: notifications.email_friend_requests,
      notification_email_comments: notifications.email_comments,
      notification_email_mentions: notifications.email_mentions,
      notification_push_events: notifications.push_events,
      notification_push_messages: notifications.push_messages,
    });
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Notification preferences saved');
    }
  };

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
              <TabsTrigger value="account" className="gap-2">
                <User className="h-4 w-4 hidden sm:inline" />
                Account
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2">
                <ShoppingBag className="h-4 w-4 hidden sm:inline" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4 hidden sm:inline" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <Calendar className="h-4 w-4 hidden sm:inline" />
                Calendar
              </TabsTrigger>
            </TabsList>

            {/* Account Settings */}
            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your personal account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input 
                        value={form.first_name} 
                        onChange={(e) => setForm({...form, first_name: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input 
                        value={form.last_name} 
                        onChange={(e) => setForm({...form, last_name: e.target.value})} 
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveAccount} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Address</CardTitle>
                  <CardDescription>Change your email address</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={form.email} 
                      onChange={(e) => setForm({...form, email: e.target.value})} 
                    />
                    <p className="text-xs text-muted-foreground">A confirmation will be sent to your new email</p>
                  </div>
                  <Button 
                    onClick={handleChangeEmail} 
                    disabled={changingEmail || form.email === profile?.email}
                    variant="outline"
                  >
                    {changingEmail ? 'Sending...' : 'Change Email'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Change Password
                  </CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input 
                      type="password"
                      value={passwordForm.currentPassword} 
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})} 
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input 
                        type="password"
                        value={passwordForm.newPassword} 
                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} 
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <Input 
                        type="password"
                        value={passwordForm.confirmPassword} 
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} 
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
                    variant="outline"
                  >
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </Button>
                </CardContent>
              </Card>

              {/* Delete Account */}
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>Permanently delete your account and all associated data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Once you delete your account, there is no going back. This action will:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Delete all your profile information</li>
                      <li>Remove all your posts, comments, and messages</li>
                      <li>Delete all your events, invoices, and expenses</li>
                      <li>Remove all uploaded media files</li>
                      <li>Cancel any active course enrollments</li>
                    </ul>
                  </div>
                  {deletionRequested ? (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Confirmation email sent</p>
                      <p className="text-sm text-muted-foreground">
                        Please check your email and click the confirmation link to complete account deletion.
                      </p>
                    </div>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="gap-2">
                          <Trash2 className="h-4 w-4" />
                          Delete My Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. We will send a confirmation email to {profile?.email}. 
                            You must click the link in that email to confirm the deletion.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleRequestAccountDeletion}
                            disabled={requestingDeletion}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {requestingDeletion ? 'Sending...' : 'Send Confirmation Email'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose how you want to be notified</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Email Notifications</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Event Reminders</Label>
                          <p className="text-sm text-muted-foreground">Receive reminders for upcoming events</p>
                        </div>
                        <Switch 
                          checked={notifications.email_reminders} 
                          onCheckedChange={(v) => setNotifications({...notifications, email_reminders: v})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Invoice Updates</Label>
                          <p className="text-sm text-muted-foreground">Get notified about invoice status changes</p>
                        </div>
                        <Switch 
                          checked={notifications.email_invoices} 
                          onCheckedChange={(v) => setNotifications({...notifications, email_invoices: v})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Friend Requests</Label>
                          <p className="text-sm text-muted-foreground">Notifications when someone sends a friend request</p>
                        </div>
                        <Switch 
                          checked={notifications.email_friend_requests} 
                          onCheckedChange={(v) => setNotifications({...notifications, email_friend_requests: v})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Comments</Label>
                          <p className="text-sm text-muted-foreground">Notifications when someone comments on your posts</p>
                        </div>
                        <Switch 
                          checked={notifications.email_comments} 
                          onCheckedChange={(v) => setNotifications({...notifications, email_comments: v})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Mentions</Label>
                          <p className="text-sm text-muted-foreground">Notifications when someone mentions you</p>
                        </div>
                        <Switch 
                          checked={notifications.email_mentions} 
                          onCheckedChange={(v) => setNotifications({...notifications, email_mentions: v})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium">Push Notifications</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Event Updates</Label>
                          <p className="text-sm text-muted-foreground">Real-time updates for your events</p>
                        </div>
                        <Switch 
                          checked={notifications.push_events} 
                          onCheckedChange={(v) => setNotifications({...notifications, push_events: v})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Messages</Label>
                          <p className="text-sm text-muted-foreground">New messages from other users</p>
                        </div>
                        <Switch 
                          checked={notifications.push_messages} 
                          onCheckedChange={(v) => setNotifications({...notifications, push_messages: v})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium">Message Privacy</h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Who can send you messages?</Label>
                        <Select value={messagePrivacy} onValueChange={setMessagePrivacy}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="community">Anyone in the community</SelectItem>
                            <SelectItem value="friends">Friends only</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          {messagePrivacy === 'friends' 
                            ? 'Only people you are friends with can message you'
                            : 'Anyone in the community can send you messages'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveNotifications}>
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders & Subscriptions */}
            <TabsContent value="orders" className="space-y-6">
              <UserOrders />
              <UserSubscriptions />
            </TabsContent>

            {/* Calendar Settings */}
            <TabsContent value="calendar">
              <CalendarSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
