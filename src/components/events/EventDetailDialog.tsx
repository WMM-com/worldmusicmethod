import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { CalendarIcon, Trash2, Save, Copy, FileText, Send } from 'lucide-react';
import { Event, EventType, EventStatus, PaymentStatus, PreciseTiming } from '@/types/database';
import { cn } from '@/lib/utils';
import { eventSchema } from '@/lib/validations';
import { InvoiceCreateDialog } from '@/components/invoices/InvoiceCreateDialog';
import { MapboxAddressInput } from '@/components/ui/mapbox-address-input';
import { supabase } from '@/integrations/supabase/client';
import { PreciseTimings } from '@/components/events/PreciseTimings';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { CURRENCIES, getCurrencySymbol, convertCurrency } from '@/lib/currency';

interface FormErrors {
  title?: string;
  venue_name?: string;
  venue_address?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  fee?: string;
  notes?: string;
}

interface EventDetailDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<Event>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (id: string, newDate?: Date) => Promise<void>;
  isPending?: boolean;
}

export function EventDetailDialog({ 
  event, 
  open, 
  onOpenChange, 
  onSave, 
  onDelete,
  onDuplicate,
  isPending 
}: EventDetailDialogProps) {
  const { profile } = useAuth();
  const [editedEvent, setEditedEvent] = useState<Partial<Event>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [time, setTime] = useState('');
  const [timeTbc, setTimeTbc] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateDate, setDuplicateDate] = useState<Date | undefined>();
  const [errors, setErrors] = useState<FormErrors>({});
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [estimatedDefaultAmount, setEstimatedDefaultAmount] = useState<number>(0);
  const [preciseTimings, setPreciseTimings] = useState<PreciseTiming[]>([]);
  const queryClient = useQueryClient();

  const defaultCurrency = profile?.default_currency || 'GBP';

  useEffect(() => {
    if (event) {
      // Ensure currency defaults to user's default if not set
      const eventCurrency = event.currency || defaultCurrency;
      setEditedEvent({ ...event, currency: eventCurrency });
      const eventDate = new Date(event.start_time);
      setSelectedDate(eventDate);
      setDuplicateDate(eventDate);
      setErrors({});
      
      const isTbc = (event as any).time_tbc === true;
      setTimeTbc(isTbc);
      
      if (!isTbc) {
        setTime(format(eventDate, 'HH:mm'));
      } else {
        setTime('');
      }

      // Set estimated amount
      setEstimatedDefaultAmount(convertCurrency(event.fee || 0, eventCurrency, defaultCurrency));
      
      // Set precise timings
      const timings = (event as any).precise_timings;
      setPreciseTimings(Array.isArray(timings) ? timings : []);
    }
  }, [event, defaultCurrency]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    const result = eventSchema.safeParse({
      title: editedEvent.title,
      event_type: editedEvent.event_type,
      venue_name: editedEvent.venue_name || '',
      venue_address: editedEvent.venue_address || '',
      client_name: editedEvent.client_name || '',
      client_email: editedEvent.client_email || '',
      client_phone: editedEvent.client_phone || '',
      fee: editedEvent.fee ?? 0,
      currency: editedEvent.currency || 'GBP',
      status: editedEvent.status,
      payment_status: editedEvent.payment_status,
      notes: editedEvent.notes || '',
    });

    if (!result.success) {
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        if (field in newErrors || !newErrors[field]) {
          newErrors[field] = err.message;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!event || !selectedDate) return;

    if (!validateForm()) return;

    let startTime = new Date(selectedDate);
    if (!timeTbc && time) {
      const [hours, minutes] = time.split(':').map(Number);
      startTime.setHours(hours, minutes, 0, 0);
    } else {
      startTime.setHours(12, 0, 0, 0);
    }

    await onSave(event.id, {
      ...editedEvent,
      start_time: startTime.toISOString(),
      time_tbc: timeTbc,
      precise_timings: preciseTimings.length > 0 ? preciseTimings : null,
    } as any);
    
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!event) return;
    await onDelete(event.id);
    onOpenChange(false);
  };

  const handleDuplicate = async () => {
    if (!event) return;
    await onDuplicate(event.id, duplicateDate);
    setDuplicateDialogOpen(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Event Details</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          <div className="space-y-2">
            <Label>Event Title *</Label>
            <Input 
              value={editedEvent.title || ''} 
              onChange={(e) => {
                setEditedEvent({...editedEvent, title: e.target.value});
                if (errors.title) setErrors({...errors, title: undefined});
              }} 
              placeholder="e.g. Wedding Reception"
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select 
                value={editedEvent.event_type} 
                onValueChange={(v) => setEditedEvent({...editedEvent, event_type: v as EventType})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gig">Gig</SelectItem>
                  <SelectItem value="session">Session</SelectItem>
                  <SelectItem value="lesson">Lesson</SelectItem>
                  <SelectItem value="rehearsal">Rehearsal</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={editedEvent.status} 
                onValueChange={(v) => setEditedEvent({...editedEvent, status: v as EventStatus})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pencilled">Pencilled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Time</Label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="time-tbc" 
                  checked={timeTbc}
                  onCheckedChange={(checked) => setTimeTbc(checked === true)}
                />
                <label htmlFor="time-tbc" className="text-sm text-muted-foreground cursor-pointer">
                  Time TBC
                </label>
              </div>
            </div>
            <Input 
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)}
              disabled={timeTbc}
              className={cn(timeTbc && "opacity-50")}
            />
          </div>

          <PreciseTimings timings={preciseTimings} onChange={setPreciseTimings} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input 
                value={editedEvent.venue_name || ''} 
                onChange={(e) => setEditedEvent({...editedEvent, venue_name: e.target.value})} 
                placeholder="Venue name" 
              />
            </div>
          </div>

          {/* Fee and Currency Section */}
          <div className="space-y-3 p-4 rounded-lg bg-secondary/30">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label>Fee</Label>
                <Input 
                  type="number" 
                  value={editedEvent.fee || 0} 
                  onChange={(e) => {
                    const newFee = parseFloat(e.target.value) || 0;
                    const eventCurrency = editedEvent.currency || defaultCurrency;
                    setEditedEvent({...editedEvent, fee: newFee});
                    setEstimatedDefaultAmount(convertCurrency(newFee, eventCurrency, defaultCurrency));
                  }} 
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select 
                  value={editedEvent.currency || defaultCurrency} 
                  onValueChange={(v) => {
                    setEditedEvent({...editedEvent, currency: v});
                    setEstimatedDefaultAmount(convertCurrency(editedEvent.fee || 0, v, defaultCurrency));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Estimated amount in default currency - only show if different currency */}
            {editedEvent.currency && editedEvent.currency !== defaultCurrency && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Estimated in {defaultCurrency} (editable)
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{getCurrencySymbol(defaultCurrency)}</span>
                  <Input 
                    type="number" 
                    value={estimatedDefaultAmount} 
                    onChange={(e) => setEstimatedDefaultAmount(parseFloat(e.target.value) || 0)}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This is an estimate for reporting. Actual amount may vary.
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Venue Address</Label>
            <MapboxAddressInput 
              value={editedEvent.venue_address || ''} 
              onChange={(value) => setEditedEvent({...editedEvent, venue_address: value})} 
              placeholder="Start typing an address..." 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input 
                value={editedEvent.client_name || ''} 
                onChange={(e) => setEditedEvent({...editedEvent, client_name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Client Email</Label>
              <Input 
                type="email" 
                value={editedEvent.client_email || ''} 
                onChange={(e) => {
                  setEditedEvent({...editedEvent, client_email: e.target.value});
                  if (errors.client_email) setErrors({...errors, client_email: undefined});
                }}
                className={errors.client_email ? 'border-destructive' : ''}
              />
              {errors.client_email && <p className="text-sm text-destructive">{errors.client_email}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Client Phone</Label>
            <Input 
              type="tel" 
              value={editedEvent.client_phone || ''} 
              onChange={(e) => setEditedEvent({...editedEvent, client_phone: e.target.value})} 
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Status</Label>
            <Select 
              value={editedEvent.payment_status} 
              onValueChange={(v) => setEditedEvent({...editedEvent, payment_status: v as PaymentStatus})}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {editedEvent.payment_status === 'partial' && (
            <div className="space-y-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <Label>Amount Already Received</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{getCurrencySymbol(editedEvent.currency || defaultCurrency)}</span>
                <Input 
                  type="number" 
                  value={(editedEvent as any).amount_paid || 0}
                  onChange={(e) => setEditedEvent({...editedEvent, amount_paid: parseFloat(e.target.value) || 0} as any)}
                  placeholder="0.00"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Outstanding: {getCurrencySymbol(editedEvent.currency || defaultCurrency)}{Math.max(0, (editedEvent.fee || 0) - ((editedEvent as any).amount_paid || 0)).toFixed(2)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea 
              value={editedEvent.notes || ''} 
              onChange={(e) => {
                setEditedEvent({...editedEvent, notes: e.target.value});
                if (errors.notes) setErrors({...errors, notes: undefined});
              }} 
              placeholder="Any additional notes..."
              rows={3}
              className={errors.notes ? 'border-destructive' : ''}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes}</p>}
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button 
              className="flex-1 gradient-primary" 
              onClick={handleSave} 
              disabled={isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              title="Create invoice"
              onClick={() => setInvoiceDialogOpen(true)}
            >
              <FileText className="h-4 w-4" />
            </Button>
            
            <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  title="Duplicate event"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Duplicate Event</AlertDialogTitle>
                  <AlertDialogDescription>
                    Choose a date for the duplicated event. The time and all other details will be copied.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Label className="mb-2 block">New Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !duplicateDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {duplicateDate ? format(duplicateDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={duplicateDate}
                        onSelect={setDuplicateDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDuplicate}>Duplicate</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" title="Delete event">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Move to bin?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This event will be moved to the bin. You can restore it later or permanently delete it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Move to Bin</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <InvoiceCreateDialog
            open={invoiceDialogOpen}
            onOpenChange={setInvoiceDialogOpen}
            fromEvent={event}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
