import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapboxAddressInput } from '@/components/ui/mapbox-address-input';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarSettings } from '@/components/settings/CalendarSettings';

import { InvoiceMessagesCard } from '@/components/settings/InvoiceMessagesCard';
import { InvoiceMessageTemplate } from '@/types/database';
import { toast } from 'sonner';
import { Building2, Calendar } from 'lucide-react';

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
    invoice_late_payment_messages: [] as InvoiceMessageTemplate[],
    invoice_thank_you_messages: [] as InvoiceMessageTemplate[],
    auto_add_late_payment_message: false,
    auto_add_thank_you_message: false,
    default_late_payment_message_id: null as string | null,
    default_thank_you_message_id: null as string | null,
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
        invoice_late_payment_messages: (profile.invoice_late_payment_messages as InvoiceMessageTemplate[] | null) || [],
        invoice_thank_you_messages: (profile.invoice_thank_you_messages as InvoiceMessageTemplate[] | null) || [],
        auto_add_late_payment_message: profile.auto_add_late_payment_message || false,
        auto_add_thank_you_message: profile.auto_add_thank_you_message || false,
        default_late_payment_message_id: profile.default_late_payment_message_id || null,
        default_thank_you_message_id: profile.default_thank_you_message_id || null,
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
          <p className="text-muted-foreground">Configure your business information and calendar sync</p>
        </div>

        <Tabs defaultValue="business" className="space-y-6">
          <TabsList>
            <TabsTrigger value="business" className="gap-2">
              <Building2 className="h-4 w-4" />
              Business
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendar Sync
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="space-y-6">
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
                <div className="pt-4 border-t">
                  <Button className="gradient-primary" onClick={handleSaveBusiness} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Business Info'}
                  </Button>
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

            <InvoiceMessagesCard
              latePaymentMessages={businessForm.invoice_late_payment_messages}
              thankYouMessages={businessForm.invoice_thank_you_messages}
              autoAddLatePayment={businessForm.auto_add_late_payment_message}
              autoAddThankYou={businessForm.auto_add_thank_you_message}
              defaultLatePaymentId={businessForm.default_late_payment_message_id}
              defaultThankYouId={businessForm.default_thank_you_message_id}
              onUpdate={(updates) => setBusinessForm({ ...businessForm, ...updates })}
              onSave={handleSaveBusiness}
              saving={saving}
            />

            <div className="flex justify-end">
              <Button className="gradient-primary" onClick={handleSaveBusiness} disabled={saving}>
                {saving ? 'Saving...' : 'Save All Settings'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
