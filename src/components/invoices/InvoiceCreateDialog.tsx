import { useState, useEffect } from 'react';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, Trash2, FileText, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInvoices, useGenerateInvoiceNumber } from '@/hooks/useInvoices';
import { Event, InvoiceItem } from '@/types/database';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
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

const invoiceCreateSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  client_name: z.string().min(1, 'Client name is required'),
  client_email: z.string().email('Invalid email').optional().or(z.literal('')),
  client_address: z.string().optional(),
  currency: z.string().length(3, 'Currency required'),
  due_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Description required'),
    quantity: z.number().positive('Must be positive'),
    rate: z.number().nonnegative('Cannot be negative'),
    amount: z.number().nonnegative(),
  })).min(1, 'At least one item required'),
});

interface InvoiceCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromEvent?: Event | null;
}

export function InvoiceCreateDialog({ open, onOpenChange, fromEvent }: InvoiceCreateDialogProps) {
  const { profile } = useAuth();
  const { createInvoice } = useInvoices();
  const { data: generatedNumber } = useGenerateInvoiceNumber();

  const defaultCurrency = profile?.default_currency || 'GBP';
  
  const [form, setForm] = useState({
    invoice_number: '',
    client_name: '',
    client_email: '',
    client_address: '',
    currency: defaultCurrency,
    due_date: undefined as Date | undefined,
    notes: '',
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, rate: 0, amount: 0 }
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sendingAfterCreate, setSendingAfterCreate] = useState(false);
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (fromEvent) {
        // Pre-fill from event
        setForm({
          invoice_number: generatedNumber || '',
          client_name: fromEvent.client_name || '',
          client_email: fromEvent.client_email || '',
          client_address: '',
          currency: fromEvent.currency || defaultCurrency,
          due_date: addDays(new Date(), 30),
          notes: '',
        });
        setItems([{
          description: `${fromEvent.title} - ${format(new Date(fromEvent.start_time), 'MMMM d, yyyy')}${fromEvent.venue_name ? ` at ${fromEvent.venue_name}` : ''}`,
          quantity: 1,
          rate: fromEvent.fee || 0,
          amount: fromEvent.fee || 0,
        }]);
      } else {
        // Fresh form
        setForm({
          invoice_number: generatedNumber || '',
          client_name: '',
          client_email: '',
          client_address: '',
          currency: defaultCurrency,
          due_date: addDays(new Date(), 30),
          notes: '',
        });
        setItems([{ description: '', quantity: 1, rate: 0, amount: 0 }]);
      }
      setErrors({});
    }
  }, [open, fromEvent, generatedNumber, defaultCurrency]);

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      // Recalculate amount
      if (field === 'quantity' || field === 'rate') {
        newItems[index].amount = newItems[index].quantity * newItems[index].rate;
      }
      return newItems;
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find(c => c.code === code)?.symbol || code;
  };

  const handleSubmit = async (andSend: boolean = false) => {
    const data = {
      ...form,
      due_date: form.due_date ? format(form.due_date, 'yyyy-MM-dd') : undefined,
      items,
    };

    const result = invoiceCreateSchema.safeParse(data);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        newErrors[err.path.join('.')] = err.message;
      });
      setErrors(newErrors);
      return;
    }

    if (andSend && !form.client_email) {
      toast.error('Client email is required to send invoice');
      return;
    }

    setSendingAfterCreate(andSend);

    const invoice = await createInvoice.mutateAsync({
      invoice_number: form.invoice_number,
      client_name: form.client_name,
      client_email: form.client_email || null,
      client_address: form.client_address || null,
      amount: totalAmount,
      currency: form.currency,
      due_date: form.due_date ? format(form.due_date, 'yyyy-MM-dd') : null,
      notes: form.notes || null,
      items,
      status: 'unpaid',
      event_id: fromEvent?.id || null,
      sent_at: null,
      paid_at: null,
    });

    if (andSend && invoice) {
      try {
        const { error } = await supabase.functions.invoke('send-invoice', {
          body: {
            invoiceId: invoice.id,
            recipientEmail: form.client_email,
            senderName: profile?.business_name || profile?.full_name,
          },
        });
        if (error) throw error;
        toast.success('Invoice created and sent successfully');
      } catch (error: any) {
        toast.error('Invoice created but failed to send: ' + (error.message || 'Unknown error'));
      }
    } else {
      toast.success('Invoice created successfully');
    }

    setSendingAfterCreate(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Your Business Info (readonly display) */}
          {(profile?.business_name || profile?.full_name) && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <p className="font-medium">{profile?.business_name || profile?.full_name}</p>
              {profile?.address && <p className="text-sm text-muted-foreground whitespace-pre-line">{profile.address}</p>}
              {profile?.tax_id && <p className="text-sm text-muted-foreground">Tax ID: {profile.tax_id}</p>}
              {profile?.vat_number && <p className="text-sm text-muted-foreground">VAT: {profile.vat_number}</p>}
              {profile?.bank_details && (
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{profile.bank_details}</p>
              )}
            </div>
          )}

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Invoice Number *</Label>
              <Input
                value={form.invoice_number}
                onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                className={cn(errors.invoice_number && 'border-destructive')}
              />
              {errors.invoice_number && <p className="text-sm text-destructive">{errors.invoice_number}</p>}
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
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

          {/* Client Details */}
          <div className="space-y-4">
            <h3 className="font-medium">Client Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  className={cn(errors.client_name && 'border-destructive')}
                />
                {errors.client_name && <p className="text-sm text-destructive">{errors.client_name}</p>}
              </div>
              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input
                  type="email"
                  value={form.client_email}
                  onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                  className={cn(errors.client_email && 'border-destructive')}
                />
                {errors.client_email && <p className="text-sm text-destructive">{errors.client_email}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Client Address</Label>
              <Textarea
                value={form.client_address}
                onChange={(e) => setForm({ ...form, client_address: e.target.value })}
                rows={2}
                placeholder="Street, City, Postcode, Country"
              />
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.due_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.due_date ? format(form.due_date, "PPP") : "Select due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.due_date}
                  onSelect={(date) => setForm({ ...form, due_date: date })}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Line Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5 space-y-1">
                    {index === 0 && <Label className="text-xs">Description</Label>}
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Service description"
                      className={cn(errors[`items.${index}.description`] && 'border-destructive')}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    {index === 0 && <Label className="text-xs">Qty</Label>}
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    {index === 0 && <Label className="text-xs">Rate</Label>}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    {index === 0 && <Label className="text-xs">Amount</Label>}
                    <Input
                      value={`${getCurrencySymbol(form.currency)}${item.amount.toFixed(2)}`}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    {index === 0 && <Label className="text-xs">&nbsp;</Label>}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {errors.items && <p className="text-sm text-destructive">{errors.items}</p>}

            {/* Total */}
            <div className="flex justify-end border-t pt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">
                  {getCurrencySymbol(form.currency)}{totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes / Payment Terms</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="e.g. Interest will be charged at 2% per month on overdue invoices. Payment via bank transfer preferred."
            />
            <p className="text-xs text-muted-foreground">
              Add late payment terms, bank details, or thank you message
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={createInvoice.isPending || sendingAfterCreate}
            >
              <FileText className="h-4 w-4 mr-2" />
              {createInvoice.isPending && !sendingAfterCreate ? 'Creating...' : 'Save Invoice'}
            </Button>
            <Button 
              className="gradient-primary" 
              onClick={() => handleSubmit(true)}
              disabled={createInvoice.isPending || sendingAfterCreate || !form.client_email}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendingAfterCreate ? 'Sending...' : 'Save & Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}