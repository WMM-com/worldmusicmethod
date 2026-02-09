import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ReferralSection } from '@/components/profile/ReferralSection';
import { 
  User, Bell, ShoppingBag, Lock, AlertTriangle, Trash2, 
  AtSign, Eye, EyeOff, ChevronRight, Globe, Users, Clock, Link2, AlertCircle,
  BadgeCheck, Gift
} from 'lucide-react';
import { VerifiedBadge, isUserVerified } from '@/components/profile/VerifiedBadge';
import { cn } from '@/lib/utils';
import { useChangeUsername } from '@/hooks/useUsernameResolution';
import { useCheckUsername } from '@/hooks/useCheckUsername';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type Section = 'profile' | 'orders' | 'notifications' | 'security' | 'referrals';

export default function Account() {
  const { user, profile, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [showUsernameConfirm, setShowUsernameConfirm] = useState(false);
  const [pendingUsername, setPendingUsername] = useState('');
  const changeUsername = useChangeUsername();
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

  const { result: usernameCheck, checking: checkingUsername } = useCheckUsername(usernameInput, form.username);

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [verifiedAlertDismissed, setVerifiedAlertDismissed] = useState(
    () => localStorage.getItem('verified-alert-dismissed') === 'true'
  );
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
      setUsernameInput((profile as any).username || '');
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
      display_name_preference: form.display_name_preference,
      visibility: form.visibility,
      is_public: form.visibility === 'public',
    } as any);
    
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Profile settings saved');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['extended-profile'] });
    }
    setSaving(false);
  };

  const handleUsernameClick = () => {
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      toast.error('Username cannot be empty');
      return;
    }
    setPendingUsername(trimmed);
    setShowUsernameConfirm(true);
  };

  const handleConfirmUsername = async () => {
    const usernameToSet = pendingUsername;
    setShowUsernameConfirm(false);
    setSavingUsername(true);
    try {
      const result = await changeUsername.mutateAsync(usernameToSet);
      if (result.success) {
        const newUsername = result.username || usernameToSet;
        toast.success(result.message || 'Username updated');
        setForm(prev => ({ ...prev, username: newUsername }));
        setUsernameInput(newUsername);
        // Navigate to the new branded URL so the address bar updates immediately
        navigate(`/${newUsername}`, { replace: true });
      } else {
        toast.error(result.error || 'Failed to change username');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to change username');
    }
    setSavingUsername(false);
  };

  // Calculate cooldown info with retry logic
  const usernameChangeCount = (profile as any)?.username_change_count ?? 0;
  const cooldownInfo = useMemo(() => {
    const lastChange = (profile as any)?.last_username_change;
    const changeCount = (profile as any)?.username_change_count ?? 0;
    
    // First time or free retry (count 0 or 1) = no cooldown
    if (changeCount < 2) return { canChange: true, daysRemaining: 0 };
    
    // After using retry, cooldown applies
    if (!lastChange) return { canChange: true, daysRemaining: 0 };
    const daysSince = Math.floor((Date.now() - new Date(lastChange).getTime()) / (1000 * 60 * 60 * 24));
    const cooldownDays = 30;
    return {
      canChange: daysSince >= cooldownDays,
      daysRemaining: Math.max(0, cooldownDays - daysSince),
    };
  }, [profile]);

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
    { id: 'referrals', label: 'Invite Friends', icon: Gift },
    { id: 'notifications', label: 'Notification Preferences', icon: Bell },
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
                  {/* Verification Badge Status */}
                  {profile && (() => {
                    const emailOk = (profile as any).email_verified === true;
                    const usernameOk = !!(profile as any).username?.trim();
                    const verified = emailOk && usernameOk;
                    
                    if (verified) {
                      if (verifiedAlertDismissed) return null;
                      
                      return (
                        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 flex items-center gap-3 relative">
                          <VerifiedBadge size="lg" />
                          <div className="flex-1">
                            <p className="font-semibold text-sm">Your account is verified</p>
                            <p className="text-xs text-muted-foreground">
                              Your verified badge is displayed next to your name on your profile.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              localStorage.setItem('verified-alert-dismissed', 'true');
                              setVerifiedAlertDismissed(true);
                            }}
                            className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            aria-label="Dismiss"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    }
                    
                    const missing: string[] = [];
                    if (!emailOk) missing.push('verify your email');
                    if (!usernameOk) missing.push('set a username');
                    
                    return (
                      <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
                        <BadgeCheck className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm">Get your verified badge</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Complete these steps to earn a verified badge next to your name: {missing.join(' and ')}.
                          </p>
                          <div className="flex gap-3 mt-2">
                            <span className={cn(
                              "text-xs flex items-center gap-1",
                              emailOk ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                            )}>
                              {emailOk ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                              Email verified
                            </span>
                            <span className={cn(
                              "text-xs flex items-center gap-1",
                              usernameOk ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                            )}>
                              {usernameOk ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                              Username set
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

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
                        <div className="flex items-start space-x-3 p-3 rounded-lg border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-colors">
                          <RadioGroupItem value="public" id="visibility-public" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="visibility-public" className="flex items-center gap-2 cursor-pointer font-medium text-green-600 dark:text-green-400">
                              <Globe className="h-4 w-4" />
                              Public
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Everyone can see your profile. You'll appear in the community members page.
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
                      
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Link2 className="h-4 w-4" />
                          Profile URL (Username)
                        </Label>
                        <div className="flex gap-2">
                          <div className="flex items-center gap-0 flex-1">
                            <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0 border-input whitespace-nowrap">
                              /
                            </span>
                            <div className="relative flex-1">
                              <Input 
                                value={usernameInput} 
                                onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} 
                                placeholder="yourname"
                                className={cn(
                                  "rounded-l-none pr-9",
                                  usernameCheck?.available === true && usernameInput !== form.username && "border-green-500 focus-visible:ring-green-500",
                                  usernameCheck?.available === false && "border-destructive focus-visible:ring-destructive",
                                )}
                                maxLength={30}
                                disabled={!cooldownInfo.canChange}
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {checkingUsername && (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                                {!checkingUsername && usernameCheck?.available === true && usernameInput !== form.username && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                                {!checkingUsername && usernameCheck?.available === false && (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                              </div>
                            </div>
                          </div>
                          <Button 
                            onClick={handleUsernameClick} 
                            disabled={
                              savingUsername || 
                              usernameInput === form.username || 
                              !cooldownInfo.canChange || 
                              checkingUsername ||
                              usernameCheck?.available === false ||
                              !usernameInput.trim() ||
                              usernameInput.trim().length < 3
                            }
                            size="sm"
                            variant="outline"
                          >
                            {savingUsername ? 'Saving...' : 'Set'}
                          </Button>
                        </div>
                        
                        {/* Real-time feedback messages */}
                        {!checkingUsername && usernameCheck?.error && (
                          <p className="text-xs text-destructive flex items-center gap-1.5">
                            <AlertCircle className="h-3 w-3" />
                            {usernameCheck.error}
                          </p>
                        )}
                        
                        {!checkingUsername && usernameCheck?.available && usernameInput !== form.username && (
                          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3" />
                            Username is available!
                          </p>
                        )}

                        {!checkingUsername && usernameCheck?.message && usernameInput === form.username && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3" />
                            {usernameCheck.message}
                          </p>
                        )}
                        
                        {form.username && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Globe className="h-3 w-3" />
                            Your profile URL: <span className="font-mono font-medium text-foreground">worldmusicmethod.lovable.app/{form.username}</span>
                          </p>
                        )}
                        
                        {!cooldownInfo.canChange && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            Username can be changed again in {cooldownInfo.daysRemaining} days
                          </p>
                        )}

                        {cooldownInfo.canChange && usernameChangeCount === 1 && form.username && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <AlertCircle className="h-3 w-3" />
                            You have one free retry to change your username. After that, a 30-day cooldown applies.
                          </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          3-30 characters. Letters, numbers, hyphens, underscores only. Changing your username creates a redirect from your old URL.
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

              {/* Invite Friends Section */}
              {currentSection === 'referrals' && (
                <ReferralSection />
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
      {/* Username Confirmation Modal */}
      <Dialog open={showUsernameConfirm} onOpenChange={setShowUsernameConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Username Change</DialogTitle>
            <DialogDescription>
              {usernameChangeCount === 0
                ? `You're about to set your username to "${pendingUsername}". You'll get one free retry to change it again — after that, you won't be able to change it for 30 days.`
                : usernameChangeCount === 1
                ? `You're about to change your username to "${pendingUsername}". This is your last free change — after this, you won't be able to change it again for 30 days.`
                : `You're about to change your username to "${pendingUsername}". You won't be able to change it again for 30 days.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUsernameConfirm(false)}>Cancel</Button>
            <Button onClick={handleConfirmUsername} disabled={savingUsername}>
              {savingUsername ? 'Saving...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </main>
    </div>
  );
}
