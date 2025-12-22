import { useState, useEffect } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarSettings } from '@/components/settings/CalendarSettings';
import { User, Bell, CreditCard, Brain, Calendar, Lock } from 'lucide-react';

const CURRENCIES = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

const TAX_COUNTRIES = [
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
];

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

  // Left Brain form (business settings)
  const [businessForm, setBusinessForm] = useState({
    business_name: '',
    address: '',
    bank_details: '',
    default_currency: 'GBP',
    tax_id: '',
    vat_number: '',
    tax_country: '',
  });

  // Notification settings (placeholder for now)
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
      setBusinessForm({
        business_name: profile.business_name || '',
        address: profile.address || '',
        bank_details: profile.bank_details || '',
        default_currency: profile.default_currency || 'GBP',
        tax_id: profile.tax_id || '',
        vat_number: profile.vat_number || '',
        tax_country: profile.tax_country || '',
      });
      setMessagePrivacy(profile.message_privacy || 'community');
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

  const handleSaveBusiness = async () => {
    setSaving(true);
    const { error } = await updateProfile(businessForm);
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Business settings saved');
    }
    setSaving(false);
  };

  const handleSaveNotifications = async () => {
    // Save message privacy to profile
    const { error } = await updateProfile({ message_privacy: messagePrivacy });
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
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4 hidden sm:inline" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="leftbrain" className="gap-2">
                <Brain className="h-4 w-4 hidden sm:inline" />
                Left Brain
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

            {/* Left Brain Settings */}
            <TabsContent value="leftbrain" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>This information appears on your invoices and contracts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Business Name</Label>
                      <Input 
                        value={businessForm.business_name} 
                        onChange={(e) => setBusinessForm({...businessForm, business_name: e.target.value})} 
                        placeholder="For invoices" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Currency</Label>
                      <Select 
                        value={businessForm.default_currency} 
                        onValueChange={(v) => setBusinessForm({...businessForm, default_currency: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(c => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.symbol} {c.code} - {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Business Address</Label>
                    <Textarea 
                      value={businessForm.address} 
                      onChange={(e) => setBusinessForm({...businessForm, address: e.target.value})} 
                      rows={2} 
                      placeholder="Your business address for invoices" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Details (for invoices)</Label>
                    <Textarea 
                      value={businessForm.bank_details} 
                      onChange={(e) => setBusinessForm({...businessForm, bank_details: e.target.value})} 
                      rows={3} 
                      placeholder="Account name, sort code, account number, IBAN, BIC/SWIFT..." 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tax Information</CardTitle>
                  <CardDescription>Configure your tax identifiers for international invoicing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tax Residency Country</Label>
                      <Select 
                        value={businessForm.tax_country || "none"} 
                        onValueChange={(v) => setBusinessForm({...businessForm, tax_country: v === "none" ? "" : v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not set</SelectItem>
                          {TAX_COUNTRIES.map(c => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.flag} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Used for tax estimation</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Tax ID / UTR</Label>
                      <Input 
                        value={businessForm.tax_id} 
                        onChange={(e) => setBusinessForm({...businessForm, tax_id: e.target.value})} 
                        placeholder="e.g. UTR, Steuernummer, NIF..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>VAT Number</Label>
                    <Input 
                      value={businessForm.vat_number} 
                      onChange={(e) => setBusinessForm({...businessForm, vat_number: e.target.value})} 
                      placeholder="e.g. GB123456789"
                    />
                    <p className="text-xs text-muted-foreground">Required if VAT registered</p>
                  </div>

                  <Button className="gradient-primary" onClick={handleSaveBusiness} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Business Settings'}
                  </Button>
                </CardContent>
              </Card>
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
