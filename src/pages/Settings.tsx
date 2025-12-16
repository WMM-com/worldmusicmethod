import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CalendarSettings } from '@/components/settings/CalendarSettings';
export default function Settings() {
  const { profile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    business_name: profile?.business_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    bank_details: profile?.bank_details || '',
  });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile(form);
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Settings saved');
    }
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
        </div>

        <Card className="glass max-w-2xl">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input value={form.business_name} onChange={(e) => setForm({...form, business_name: e.target.value})} placeholder="For invoices" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Bank Details (for invoices)</Label>
              <Textarea value={form.bank_details} onChange={(e) => setForm({...form, bank_details: e.target.value})} rows={3} placeholder="Account name, sort code, account number" />
            </div>
            <Button className="gradient-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <CalendarSettings />
      </div>
    </AppLayout>
  );
}
