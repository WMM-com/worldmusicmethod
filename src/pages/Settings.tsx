import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CalendarSettings } from '@/components/settings/CalendarSettings';

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
  const [form, setForm] = useState({
    full_name: '',
    business_name: '',
    phone: '',
    address: '',
    bank_details: '',
    default_currency: 'GBP',
    tax_id: '',
    vat_number: '',
    tax_country: '',
  });

  // Sync form with profile when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        business_name: profile.business_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        bank_details: profile.bank_details || '',
        default_currency: profile.default_currency || 'GBP',
        tax_id: profile.tax_id || '',
        vat_number: profile.vat_number || '',
        tax_country: profile.tax_country || '',
      });
    }
  }, [profile]);

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
            <CardDescription>This information appears on your invoices and contracts</CardDescription>
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
              <Textarea value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} rows={2} placeholder="Your business address for invoices" />
            </div>
            <div className="space-y-2">
              <Label>Bank Details (for invoices)</Label>
              <Textarea value={form.bank_details} onChange={(e) => setForm({...form, bank_details: e.target.value})} rows={3} placeholder="Account name, sort code, account number, IBAN, BIC/SWIFT..." />
            </div>
          </CardContent>
        </Card>

        <Card className="glass max-w-2xl">
          <CardHeader>
            <CardTitle>Invoice & Tax Settings</CardTitle>
            <CardDescription>Configure your default currency and tax identifiers for international invoicing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select value={form.default_currency} onValueChange={(v) => setForm({...form, default_currency: v})}>
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
                <p className="text-xs text-muted-foreground">Pre-selected for new invoices/events</p>
              </div>
              <div className="space-y-2">
                <Label>Tax Residency Country</Label>
                <Select 
                  value={form.tax_country || "none"} 
                  onValueChange={(v) => setForm({...form, tax_country: v === "none" ? "" : v})}
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
                <p className="text-xs text-muted-foreground">Used for tax estimation on Finances page</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tax ID / UTR</Label>
                <Input 
                  value={form.tax_id} 
                  onChange={(e) => setForm({...form, tax_id: e.target.value})} 
                  placeholder="e.g. UTR, Steuernummer, NIF..."
                />
                <p className="text-xs text-muted-foreground">
                  UK: Self Assessment UTR<br/>
                  Germany: Steuernummer<br/>
                  Spain: NIF/NIE
                </p>
              </div>
              <div className="space-y-2">
                <Label>VAT Number</Label>
                <Input 
                  value={form.vat_number} 
                  onChange={(e) => setForm({...form, vat_number: e.target.value})} 
                  placeholder="e.g. GB123456789"
                />
                <p className="text-xs text-muted-foreground">
                  Required if VAT registered<br/>
                  Format varies by country
                </p>
              </div>
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