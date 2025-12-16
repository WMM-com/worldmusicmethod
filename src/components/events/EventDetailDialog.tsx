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
import { CalendarIcon, Trash2, Save, Copy } from 'lucide-react';
import { Event, EventType, EventStatus, PaymentStatus } from '@/types/database';
import { cn } from '@/lib/utils';

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
  const [editedEvent, setEditedEvent] = useState<Partial<Event>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [time, setTime] = useState('');
  const [timeTbc, setTimeTbc] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateDate, setDuplicateDate] = useState<Date | undefined>();

  useEffect(() => {
    if (event) {
      setEditedEvent(event);
      const eventDate = new Date(event.start_time);
      setSelectedDate(eventDate);
      setDuplicateDate(eventDate);
      
      // Check if time_tbc is set, otherwise try to detect from time
      const isTbc = (event as any).time_tbc === true;
      setTimeTbc(isTbc);
      
      if (!isTbc) {
        setTime(format(eventDate, 'HH:mm'));
      } else {
        setTime('');
      }
    }
  }, [event]);

  const handleSave = async () => {
    if (!event || !selectedDate) return;

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
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Event Title *</Label>
            <Input 
              value={editedEvent.title || ''} 
              onChange={(e) => setEditedEvent({...editedEvent, title: e.target.value})} 
              placeholder="e.g. Wedding Reception"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value="pending">Pending</SelectItem>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input 
                value={editedEvent.venue_name || ''} 
                onChange={(e) => setEditedEvent({...editedEvent, venue_name: e.target.value})} 
                placeholder="Venue name" 
              />
            </div>
            <div className="space-y-2">
              <Label>Fee (£)</Label>
              <Input 
                type="number" 
                value={editedEvent.fee || 0} 
                onChange={(e) => setEditedEvent({...editedEvent, fee: parseFloat(e.target.value) || 0})} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Venue Address</Label>
            <Input 
              value={editedEvent.venue_address || ''} 
              onChange={(e) => setEditedEvent({...editedEvent, venue_address: e.target.value})} 
              placeholder="Full address" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                onChange={(e) => setEditedEvent({...editedEvent, client_email: e.target.value})} 
              />
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

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea 
              value={editedEvent.notes || ''} 
              onChange={(e) => setEditedEvent({...editedEvent, notes: e.target.value})} 
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              className="flex-1 gradient-primary" 
              onClick={handleSave} 
              disabled={isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {isPending ? 'Saving...' : 'Save Changes'}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
