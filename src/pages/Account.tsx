import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { UserOrders } from '@/components/account/UserOrders';
import { UserSubscriptions } from '@/components/account/UserSubscriptions';
import { 
  User, Bell, ShoppingBag, Lock, AlertTriangle, Trash2, 
  AtSign, Eye, EyeOff, ChevronRight, Globe, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Section = 'profile' | 'orders' | 'notifications' | 'security';

export default function Account() {
  const { user, profile, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  
  const currentSection = (searchParams.get('section') as Section) || 'profile';
  
  // Account form
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    display_name_preference: 'full_name',
    visibility: 'private' as 'private' | 'members' | 'public',
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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Sync form with profile when profile loads
  useEffect(() => {
    if (profile) {
      let firstName = profile.first_name || '';
      let lastName = profile.last_name || '';
      
      if (!firstName && !lastName && profile.full_name) {
        const nameParts = profile.full_name.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      setForm({
        first_name: firstName,
        last_name: lastName,
        username: (profile as any).username || '',
        email: profile.email || '',
        display_name_preference: (profile as any).display_name_preference || 'full_name',
        visibility: (profile as any).visibility || 'private',
      });
      setMessagePrivacy(profile.message_privacy || 'community');
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

  const handleSaveProfile = async () => {
    setSaving(true);
    
    const { error } = await updateProfile({
      first_name: form.first_name,
      last_name: form.last_name,
      full_name: `${form.first_name} ${form.last_name}`.trim(),
      username: form.username || null,
      display_name_preference: form.display_name_preference,
      visibility: form.visibility,
      is_public: form.visibility === 'public', // Keep for backwards compatibility
    } as any);
    
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Profile settings saved');
      // Invalidate profile queries to sync with Profile page
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['extended-profile'] });
    }
    setSaving(false);
  };

  const handleChangeEmail = async () => {
    if (!form.email || form.email === profile?.email) {
      toast.error('Please enter a new email address');
      return;
    }

    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: form.email });

    if (error) {
      toast.error('Failed to update email: ' + error.message);
    } else {
      toast.success('Confirmation email sent to your new address.');
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
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email || '',
      password: passwordForm.currentPassword,
    });

    if (signInError) {
      toast.error('Current password is incorrect');
      setChangingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });

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
      toast.success('Confirmation email sent. Please check your inbox.');
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

  const setSection = (section: Section) => {
    setSearchParams({ section });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const sidebarItems: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile & Display', icon: User },
    { id: 'orders', label: 'Orders & Subscriptions', icon: ShoppingBag },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">My Account</h1>
            <p className="text-muted-foreground mt-1">{user?.email}</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="lg:w-64 shrink-0">
              <nav className="space-y-1">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                      currentSection === item.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </button>
                ))}
              </nav>
            </aside>

            {/* Content */}
            <div className="flex-1 space-y-6">
              {/* Profile & Display Section */}
              {currentSection === 'profile' && (
                <>
                  {/* Profile Visibility - FIRST */}
                  <Card className="border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {form.visibility === 'public' ? <Globe className="h-5 w-5 text-green-500" /> 
                         : form.visibility === 'members' ? <Users className="h-5 w-5 text-blue-500" /> 
                         : <EyeOff className="h-5 w-5 text-muted-foreground" />}
                        Profile Visibility
                      </CardTitle>
                      <CardDescription>Control who can see your profile and where it appears</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <RadioGroup 
                        value={form.visibility} 
                        onValueChange={(v: 'private' | 'members' | 'public') => setForm({...form, visibility: v})}
                        className="space-y-3"
                      >
                        <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="private" id="visibility-private" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="visibility-private" className="flex items-center gap-2 cursor-pointer font-medium">
                              <EyeOff className="h-4 w-4" />
                              Private
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Your profile is hidden. You cannot post or comment in the community.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="members" id="visibility-members" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="visibility-members" className="flex items-center gap-2 cursor-pointer font-medium">
                              <Users className="h-4 w-4" />
                              Members Only
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Only logged-in community members can see your profile. You won't appear in public member listings.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3 p-3 rounded-lg border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-colors">
                          <RadioGroupItem value="public" id="visibility-public" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="visibility-public" className="flex items-center gap-2 cursor-pointer font-medium text-green-600 dark:text-green-400">
                              <Globe className="h-4 w-4" />
                              Public (Recommended)
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Everyone can see your profile. You'll appear in the community members page and can fully participate.
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                      
                      {form.visibility === 'private' && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            ⚠️ With a private profile, you cannot post or comment in the community. 
                            Change to "Members Only" or "Public" to participate.
                          </p>
                        </div>
                      )}
                      
                      <Button onClick={handleSaveProfile} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Visibility'}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Account Information
                      </CardTitle>
                      <CardDescription>Your personal details and how your name appears</CardDescription>
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
                      
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <AtSign className="h-4 w-4" />
                          Username / Display Name
                        </Label>
                        <Input 
                          value={form.username} 
                          onChange={(e) => setForm({...form, username: e.target.value})} 
                          placeholder="Your username or band name"
                        />
                        <p className="text-xs text-muted-foreground">
                          Can include capitals, spaces, and special characters. Used for @mentions.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Display Name Preference
                      </CardTitle>
                      <CardDescription>Choose how your name appears on your profile and in the community</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Select 
                        value={form.display_name_preference} 
                        onValueChange={(v) => setForm({...form, display_name_preference: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_name">Full Name ({form.first_name} {form.last_name})</SelectItem>
                          <SelectItem value="username" disabled={!form.username}>
                            Username Only {form.username ? `(@${form.username})` : '(set a username first)'}
                          </SelectItem>
                          <SelectItem value="both" disabled={!form.username}>
                            Both {form.username ? `(${form.first_name} ${form.last_name} @${form.username})` : '(set a username first)'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Preview:</p>
                        <p className="text-lg">
                          {form.display_name_preference === 'username' && form.username 
                            ? `@${form.username}`
                            : form.display_name_preference === 'both' && form.username
                            ? `${form.first_name} ${form.last_name} @${form.username}`
                            : `${form.first_name} ${form.last_name}`}
                        </p>
                      </div>
                      
                      <Button onClick={handleSaveProfile} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Profile'}
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
                </>
              )}

              {/* Orders & Subscriptions Section */}
              {currentSection === 'orders' && (
                <>
                  <UserOrders />
                  <UserSubscriptions />
                </>
              )}

              {/* Notifications Section */}
              {currentSection === 'notifications' && (
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
              )}

              {/* Security Section */}

              {/* Security Section */}
              {currentSection === 'security' && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
