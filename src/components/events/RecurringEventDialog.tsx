import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { CalendarIcon, Repeat, X } from 'lucide-react';
import { EventType, EventStatus, PaymentStatus } from '@/types/database';
import { cn } from '@/lib/utils';

interface RecurringEventDialogProps {
  onCreateRecurring: (events: RecurringEventData[]) => Promise<void>;
  isPending: boolean;
}

export interface RecurringEventData {
  title: string;
  event_type: EventType;
  venue_name: string | null;
  venue_address: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  fee: number;
  currency: string;
  start_time: string;
  end_time: string | null;
  arrival_time: string | null;
  notes: string | null;
  status: EventStatus;
  payment_status: PaymentStatus;
  payment_date: string | null;
  tags: string[] | null;
  time_tbc: boolean;
  is_recurring: boolean;
}

export function RecurringEventDialog({ onCreateRecurring, isPending }: RecurringEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [numberOfEvents, setNumberOfEvents] = useState(2);
  const [eventDates, setEventDates] = useState<(Date | undefined)[]>([undefined, undefined]);
  const [timeUnknown, setTimeUnknown] = useState(false);
  
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

  const [errors, setErrors] = useState<{ title?: string; dates?: string }>({});

  const handleNumberOfEventsChange = (value: number) => {
    const newCount = Math.min(20, Math.max(1, value));
    setNumberOfEvents(newCount);
    
    // Adjust dates array to match new count
    setEventDates(prev => {
      if (newCount > prev.length) {
        return [...prev, ...Array(newCount - prev.length).fill(undefined)];
      } else {
        return prev.slice(0, newCount);
      }
    });
  };

  const updateDate = (index: number, date: Date | undefined) => {
    setEventDates(prev => {
      const newDates = [...prev];
      newDates[index] = date;
      return newDates;
    });
    if (errors.dates) setErrors({ ...errors, dates: undefined });
  };

  const validateForm = (): boolean => {
    const newErrors: { title?: string; dates?: string } = {};
    
    if (!eventDetails.title.trim()) {
      newErrors.title = 'Event title is required';
    }
    
    const filledDates = eventDates.filter(d => d !== undefined);
    if (filledDates.length === 0) {
      newErrors.dates = 'At least one date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    
    const filledDates = eventDates.filter((d): d is Date => d !== undefined);
    
    const events: RecurringEventData[] = filledDates.map((date, index) => {
      const eventDate = new Date(date);
      
      if (!timeUnknown && eventDetails.time) {
        const [hours, minutes] = eventDetails.time.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);
      } else {
        eventDate.setHours(12, 0, 0, 0);
      }
      
      return {
        title: filledDates.length > 1 ? `${eventDetails.title} #${index + 1}` : eventDetails.title,
        event_type: eventDetails.event_type,
        venue_name: eventDetails.venue_name || null,
        venue_address: null,
        client_name: eventDetails.client_name || null,
        client_email: eventDetails.client_email || null,
        client_phone: null,
        fee: eventDetails.fee,
        currency: eventDetails.currency,
        start_time: eventDate.toISOString(),
        end_time: null,
        arrival_time: null,
        notes: null,
        status: eventDetails.status,
        payment_status: eventDetails.payment_status,
        payment_date: null,
        tags: null,
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
    setEventDates([undefined, undefined]);
    setNumberOfEvents(2);
    setTimeUnknown(false);
    setErrors({});
  };

  const filledDatesCount = eventDates.filter(d => d !== undefined).length;

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
        <div className="flex flex-col gap-6 py-4">
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Label>Number of Events</Label>
            <Input 
              type="number" 
              min={1}
              max={20}
              value={numberOfEvents} 
              onChange={(e) => handleNumberOfEventsChange(parseInt(e.target.value) || 1)} 
            />
          </div>

          <div className="space-y-2">
            <Label>Event Dates *</Label>
            {errors.dates && <p className="text-sm text-destructive">{errors.dates}</p>}
            <div className="space-y-2 max-h-48 overflow-y-auto p-1">
              {eventDates.map((date, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-6">#{index + 1}</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "EEE, MMM d, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => updateDate(index, d)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {date && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateDate(index, undefined)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Time (applies to all events)</Label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <Button 
            className="w-full gradient-primary" 
            onClick={handleCreate} 
            disabled={isPending || filledDatesCount === 0}
          >
            {isPending ? 'Creating...' : `Create ${filledDatesCount} Event${filledDatesCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
