import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { CalendarIcon, Repeat } from 'lucide-react';
import { EventType, EventStatus, PaymentStatus } from '@/types/database';
import { cn } from '@/lib/utils';

interface RecurringEventDialogProps {
  onCreateRecurring: (events: RecurringEventData[]) => Promise<void>;
  isPending: boolean;
}

interface RecurringEventData {
  title: string;
  event_type: EventType;
  venue_name: string;
  client_name: string;
  client_email: string;
  fee: number;
  currency: string;
  start_time: string;
  status: EventStatus;
  payment_status: PaymentStatus;
  time_tbc: boolean;
  is_recurring: boolean;
}

type RecurrenceInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export function RecurringEventDialog({ onCreateRecurring, isPending }: RecurringEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>('weekly');
  const [occurrences, setOccurrences] = useState(4);
  
  const [eventDetails, setEventDetails] = useState({
    title: '',
    event_type: 'gig' as EventType,
    venue_name: '',
    client_name: '',
    client_email: '',
    fee: 0,
    currency: 'GBP',
    time: '',
    status: 'confirmed' as EventStatus,
    payment_status: 'unpaid' as PaymentStatus,
  });

  const [errors, setErrors] = useState<{ title?: string; date?: string }>({});

  const generateDates = (start: Date, interval: RecurrenceInterval, count: number): Date[] => {
    const dates: Date[] = [];
    let currentDate = new Date(start);
    
    for (let i = 0; i < count; i++) {
      dates.push(new Date(currentDate));
      
      switch (interval) {
        case 'daily':
          currentDate = addDays(currentDate, 1);
          break;
        case 'weekly':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'biweekly':
          currentDate = addWeeks(currentDate, 2);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, 1);
          break;
      }
    }
    
    return dates;
  };

  const validateForm = (): boolean => {
    const newErrors: { title?: string; date?: string } = {};
    
    if (!eventDetails.title.trim()) {
      newErrors.title = 'Event title is required';
    }
    
    if (!startDate) {
      newErrors.date = 'Start date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm() || !startDate) return;
    
    const dates = generateDates(startDate, recurrenceInterval, occurrences);
    
    const events: RecurringEventData[] = dates.map((date, index) => {
      const eventDate = new Date(date);
      
      if (!timeUnknown && eventDetails.time) {
        const [hours, minutes] = eventDetails.time.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);
      } else {
        eventDate.setHours(12, 0, 0, 0);
      }
      
      return {
        title: occurrences > 1 ? `${eventDetails.title} #${index + 1}` : eventDetails.title,
        event_type: eventDetails.event_type,
        venue_name: eventDetails.venue_name,
        client_name: eventDetails.client_name,
        client_email: eventDetails.client_email,
        fee: eventDetails.fee,
        currency: eventDetails.currency,
        start_time: eventDate.toISOString(),
        status: eventDetails.status,
        payment_status: eventDetails.payment_status,
        time_tbc: timeUnknown,
        is_recurring: true,
      };
    });
    
    await onCreateRecurring(events);
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEventDetails({
      title: '',
      event_type: 'gig',
      venue_name: '',
      client_name: '',
      client_email: '',
      fee: 0,
      currency: 'GBP',
      time: '',
      status: 'confirmed',
      payment_status: 'unpaid',
    });
    setStartDate(undefined);
    setTimeUnknown(false);
    setRecurrenceInterval('weekly');
    setOccurrences(4);
    setErrors({});
  };

  const previewDates = startDate ? generateDates(startDate, recurrenceInterval, Math.min(occurrences, 8)) : [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Repeat className="h-4 w-4 mr-2" />
          Recurring
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Recurring Events</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Event Title *</Label>
            <Input 
              value={eventDetails.title} 
              onChange={(e) => {
                setEventDetails({...eventDetails, title: e.target.value});
                if (errors.title) setErrors({...errors, title: undefined});
              }} 
              placeholder="e.g. Jazz Residency"
              className={cn(errors.title && "border-destructive")}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            <p className="text-xs text-muted-foreground">Each event will be numbered (e.g., "Jazz Residency #1")</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={eventDetails.event_type} onValueChange={(v) => setEventDetails({...eventDetails, event_type: v as EventType})}>
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
              <Select value={eventDetails.status} onValueChange={(v) => setEventDetails({...eventDetails, status: v as EventStatus})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pencilled">Pencilled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>First Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground",
                    errors.date && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    if (errors.date) setErrors({...errors, date: undefined});
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Repeat Every</Label>
              <Select value={recurrenceInterval} onValueChange={(v) => setRecurrenceInterval(v as RecurrenceInterval)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Day</SelectItem>
                  <SelectItem value="weekly">Week</SelectItem>
                  <SelectItem value="biweekly">2 Weeks</SelectItem>
                  <SelectItem value="monthly">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of Events</Label>
              <Input 
                type="number" 
                min={1}
                max={52}
                value={occurrences} 
                onChange={(e) => setOccurrences(Math.min(52, Math.max(1, parseInt(e.target.value) || 1)))} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Time</Label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="recurring-time-unknown" 
                  checked={timeUnknown}
                  onCheckedChange={(checked) => setTimeUnknown(checked === true)}
                />
                <label htmlFor="recurring-time-unknown" className="text-sm text-muted-foreground cursor-pointer">
                  Time TBC
                </label>
              </div>
            </div>
            <Input 
              type="time" 
              value={eventDetails.time} 
              onChange={(e) => setEventDetails({...eventDetails, time: e.target.value})}
              disabled={timeUnknown}
              className={cn(timeUnknown && "opacity-50")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input 
                value={eventDetails.venue_name} 
                onChange={(e) => setEventDetails({...eventDetails, venue_name: e.target.value})} 
                placeholder="Venue name" 
              />
            </div>
            <div className="space-y-2">
              <Label>Fee per event (£)</Label>
              <Input 
                type="number" 
                value={eventDetails.fee} 
                onChange={(e) => setEventDetails({...eventDetails, fee: parseFloat(e.target.value) || 0})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input 
                value={eventDetails.client_name} 
                onChange={(e) => setEventDetails({...eventDetails, client_name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Client Email</Label>
              <Input 
                type="email" 
                value={eventDetails.client_email} 
                onChange={(e) => setEventDetails({...eventDetails, client_email: e.target.value})} 
              />
            </div>
          </div>

          {previewDates.length > 0 && (
            <div className="space-y-2 p-3 bg-secondary/30 rounded-lg">
              <Label className="text-sm">Preview ({occurrences} events)</Label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {previewDates.map((date, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    #{i + 1} - {format(date, 'EEE, MMM d, yyyy')}
                  </p>
                ))}
                {occurrences > 8 && (
                  <p className="text-sm text-muted-foreground italic">...and {occurrences - 8} more</p>
                )}
              </div>
            </div>
          )}

          <Button 
            className="w-full gradient-primary" 
            onClick={handleCreate} 
            disabled={isPending}
          >
            {isPending ? 'Creating...' : `Create ${occurrences} Event${occurrences > 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
