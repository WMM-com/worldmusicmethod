import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MapboxAddressInput } from '@/components/ui/mapbox-address-input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

export default function LeftBrainSettings() {
  const { profile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const [businessForm, setBusinessForm] = useState({
    business_name: '',
    address: '',
    bank_details: '',
    default_currency: 'GBP',
    tax_id: '',
    vat_number: '',
    tax_country: '',
  });

  useEffect(() => {
    if (profile) {
      setBusinessForm({
        business_name: profile.business_name || '',
        address: profile.address || '',
        bank_details: profile.bank_details || '',
        default_currency: profile.default_currency || 'GBP',
        tax_id: profile.tax_id || '',
        vat_number: profile.vat_number || '',
        tax_country: profile.tax_country || '',
      });
    }
  }, [profile]);

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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Left Brain Settings</h1>
          <p className="text-muted-foreground">Configure your business information for invoices and contracts</p>
        </div>

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
              <MapboxAddressInput 
                value={businessForm.address} 
                onChange={(value) => setBusinessForm({...businessForm, address: value})} 
                placeholder="Start typing your business address..." 
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
      </div>
    </AppLayout>
  );
}
