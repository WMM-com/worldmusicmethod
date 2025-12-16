import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useEvents } from '@/hooks/useEvents';
import { ShareEventDialog } from '@/components/events/ShareEventDialog';
import { format } from 'date-fns';
import { Plus, Calendar, Search, Share2 } from 'lucide-react';
import { EventType, EventStatus, PaymentStatus } from '@/types/database';

export default function Events() {
  const { events, isLoading, createEvent } = useEvents();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    event_type: 'gig' as EventType,
    venue_name: '',
    client_name: '',
    client_email: '',
    fee: 0,
    currency: 'GBP',
    start_time: '',
    status: 'pending' as EventStatus,
    payment_status: 'unpaid' as PaymentStatus,
    notes: '',
  });

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.venue_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.start_time) return;
    
    await createEvent.mutateAsync({
      ...newEvent,
      start_time: new Date(newEvent.start_time).toISOString(),
      venue_address: null,
      client_phone: null,
      arrival_time: null,
      end_time: null,
      payment_date: null,
      tags: null,
      is_recurring: false,
    });
    
    setDialogOpen(false);
    setNewEvent({
      title: '',
      event_type: 'gig',
      venue_name: '',
      client_name: '',
      client_email: '',
      fee: 0,
      currency: 'GBP',
      start_time: '',
      status: 'pending',
      payment_status: 'unpaid',
      notes: '',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="text-muted-foreground mt-1">Manage your gigs, sessions, and bookings</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Event Title *</Label>
                  <Input value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} placeholder="e.g. Wedding Reception" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent({...newEvent, event_type: v as EventType})}>
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
                    <Label>Date & Time *</Label>
                    <Input type="datetime-local" value={newEvent.start_time} onChange={(e) => setNewEvent({...newEvent, start_time: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Venue</Label>
                    <Input value={newEvent.venue_name} onChange={(e) => setNewEvent({...newEvent, venue_name: e.target.value})} placeholder="Venue name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fee (£)</Label>
                    <Input type="number" value={newEvent.fee} onChange={(e) => setNewEvent({...newEvent, fee: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Input value={newEvent.client_name} onChange={(e) => setNewEvent({...newEvent, client_name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Email</Label>
                    <Input type="email" value={newEvent.client_email} onChange={(e) => setNewEvent({...newEvent, client_email: e.target.value})} />
                  </div>
                </div>
                <Button className="w-full gradient-primary" onClick={handleCreateEvent} disabled={createEvent.isPending}>
                  {createEvent.isPending ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No events yet</h3>
              <p className="text-muted-foreground mb-4">Create your first event to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="glass hover:bg-secondary/30 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{event.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{event.event_type}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {event.venue_name && `${event.venue_name} • `}
                        {format(new Date(event.start_time), 'EEE, MMM d, yyyy • h:mm a')}
                      </p>
                      {event.client_name && <p className="text-sm text-muted-foreground">Client: {event.client_name}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right space-y-1">
                        <p className="font-semibold">{formatCurrency(event.fee)}</p>
                        <div className="flex gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            event.status === 'confirmed' ? 'bg-success/20 text-success' :
                            event.status === 'completed' ? 'bg-primary/20 text-primary' :
                            event.status === 'pending' ? 'bg-warning/20 text-warning' :
                            'bg-destructive/20 text-destructive'
                          }`}>{event.status}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            event.payment_status === 'paid' ? 'bg-success/20 text-success' :
                            event.payment_status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                            'bg-muted text-muted-foreground'
                          }`}>{event.payment_status}</span>
                        </div>
                      </div>
                      <ShareEventDialog 
                        event={event}
                        trigger={
                          <Button variant="ghost" size="icon" title="Share with bandmates">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
