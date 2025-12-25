import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useEvents } from '@/hooks/useEvents';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { ShareEventDialog } from '@/components/events/ShareEventDialog';
import { EventCalendarView } from '@/components/events/EventCalendarView';
import { EventDetailDialog } from '@/components/events/EventDetailDialog';
import { DeletedEventsTab } from '@/components/events/DeletedEventsTab';
import { RecurringEventDialog } from '@/components/events/RecurringEventDialog';
import { InvoiceCreateDialog } from '@/components/invoices/InvoiceCreateDialog';
import { format } from 'date-fns';
import { Plus, CalendarIcon, Search, Share2, List, LayoutGrid, Trash2, Copy, X, CheckSquare, FileText, Users } from 'lucide-react';
import { Event, EventType, EventStatus, PaymentStatus } from '@/types/database';
import { cn } from '@/lib/utils';

import { eventSchema } from '@/lib/validations';

type ViewMode = 'list' | 'calendar';

interface FormErrors {
  title?: string;
  date?: string;
  venue_name?: string;
  client_name?: string;
  client_email?: string;
  fee?: string;
  notes?: string;
}

export default function Events() {
  const { 
    events, 
    deletedEvents,
    isLoading, 
    isLoadingDeleted,
    createEvent,
    createRecurringEvents,
    updateEvent,
    rescheduleEvent,
    softDeleteEvent,
    restoreEvent,
    duplicateEvent,
    permanentDeleteEvent,
    emptyBin,
    bulkSoftDelete,
    bulkUpdateStatus,
    bulkDuplicate,
  } = useEvents();
  
  const { getEventShares } = useSharedEvents();
  
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceEvent, setInvoiceEvent] = useState<Event | null>(null);
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    event_type: 'gig' as EventType,
    venue_name: '',
    client_name: '',
    client_email: '',
    fee: 0,
    currency: 'GBP',
    time: '',
    status: 'pencilled' as EventStatus,
    payment_status: 'unpaid' as PaymentStatus,
    notes: '',
  });

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.venue_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate with Zod schema
    const result = eventSchema.safeParse({
      title: newEvent.title,
      event_type: newEvent.event_type,
      venue_name: newEvent.venue_name || undefined,
      client_name: newEvent.client_name || undefined,
      client_email: newEvent.client_email || '',
      fee: newEvent.fee,
      currency: newEvent.currency,
      status: newEvent.status,
      payment_status: newEvent.payment_status,
      notes: newEvent.notes || undefined,
    });

    if (!result.success) {
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        newErrors[field] = err.message;
      });
    }
    
    if (!selectedDate) {
      newErrors.date = 'Event date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateEvent = async () => {
    if (!validateForm()) return;
    
    let startTime: Date;
    if (selectedDate) {
      startTime = new Date(selectedDate);
      if (!timeUnknown && newEvent.time) {
        const [hours, minutes] = newEvent.time.split(':').map(Number);
        startTime.setHours(hours, minutes, 0, 0);
      } else {
        startTime.setHours(12, 0, 0, 0);
      }
    } else {
      return;
    }
    
    const { time, ...eventBase } = newEvent;

    await createEvent.mutateAsync({
      ...eventBase,
      start_time: startTime.toISOString(),
      venue_address: null,
      client_phone: null,
      arrival_time: null,
      end_time: null,
      payment_date: null,
      tags: null,
      is_recurring: false,
      time_tbc: timeUnknown,
    } as any);
    
    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewEvent({
      title: '',
      event_type: 'gig',
      venue_name: '',
      client_name: '',
      client_email: '',
      fee: 0,
      currency: 'GBP',
      time: '',
      status: 'pencilled',
      payment_status: 'unpaid',
      notes: '',
    });
    setSelectedDate(undefined);
    setTimeUnknown(false);
    setErrors({});
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const formatEventTime = (event: Event) => {
    const date = new Date(event.start_time);
    const isTbc = (event as any).time_tbc === true;
    
    if (isTbc) {
      return format(date, 'EEE, MMM d, yyyy') + ' • Time TBC';
    }
    return format(date, 'EEE, MMM d, yyyy • h:mm a');
  };

  const getStatusBadgeClass = (status: EventStatus) => {
    switch (status) {
      case 'confirmed': return 'bg-success/20 text-success';
      case 'completed': return 'bg-primary/20 text-primary';
      case 'pencilled': return 'bg-warning/20 text-warning';
      case 'cancelled': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setDetailDialogOpen(true);
  };

  const handleSaveEvent = async (id: string, updates: Partial<Event>) => {
    await updateEvent.mutateAsync({ id, ...updates });
  };

  const handleDeleteEvent = async (id: string) => {
    await softDeleteEvent.mutateAsync(id);
  };

  const toggleEventSelection = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEventIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const selectAllEvents = () => {
    if (selectedEventIds.size === filteredEvents.length) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(filteredEvents.map(e => e.id)));
    }
  };

  const clearSelection = () => {
    setSelectedEventIds(new Set());
  };

  const handleBulkDelete = async () => {
    await bulkSoftDelete.mutateAsync(Array.from(selectedEventIds));
    clearSelection();
  };

  const handleBulkDuplicate = async () => {
    await bulkDuplicate.mutateAsync(Array.from(selectedEventIds));
    clearSelection();
  };

  const handleBulkStatusChange = async (status: EventStatus) => {
    await bulkUpdateStatus.mutateAsync({ ids: Array.from(selectedEventIds), status });
    clearSelection();
  };

  const isBulkActionPending = bulkSoftDelete.isPending || bulkDuplicate.isPending || bulkUpdateStatus.isPending;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="text-muted-foreground mt-1">Manage your gigs, sessions, and bookings</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border rounded-lg p-1 bg-secondary/30">
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="h-8"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <RecurringEventDialog 
              onCreateRecurring={async (events) => { await createRecurringEvents.mutateAsync(events as any); }}
              isPending={createRecurringEvents.isPending}
            />

            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
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
                    <Input 
                      value={newEvent.title} 
                      onChange={(e) => {
                        setNewEvent({...newEvent, title: e.target.value});
                        if (errors.title) setErrors({...errors, title: undefined});
                      }} 
                      placeholder="e.g. Wedding Reception"
                      className={cn(errors.title && "border-destructive")}
                    />
                    {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
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
                      <Label>Status</Label>
                      <Select value={newEvent.status} onValueChange={(v) => setNewEvent({...newEvent, status: v as EventStatus})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pencilled">Pencilled</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
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
                            !selectedDate && "text-muted-foreground",
                            errors.date && "border-destructive"
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
                          onSelect={(date) => {
                            setSelectedDate(date);
                            if (errors.date) setErrors({...errors, date: undefined});
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Time</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="time-unknown" 
                          checked={timeUnknown}
                          onCheckedChange={(checked) => setTimeUnknown(checked === true)}
                        />
                        <label htmlFor="time-unknown" className="text-sm text-muted-foreground cursor-pointer">
                          Time TBC
                        </label>
                      </div>
                    </div>
                    <Input 
                      type="time" 
                      value={newEvent.time} 
                      onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                      disabled={timeUnknown}
                      className={cn(timeUnknown && "opacity-50")}
                    />
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
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <TabsList>
              <TabsTrigger value="active">Active Events</TabsTrigger>
              <TabsTrigger value="bin" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Bin
                {deletedEvents.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                    {deletedEvents.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'active' && (
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            )}
          </div>

          <TabsContent value="active" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading events...</div>
            ) : viewMode === 'calendar' ? (
              <EventCalendarView 
                events={filteredEvents} 
                onEventClick={handleEventClick}
                onEventReschedule={(eventId, newDate) => rescheduleEvent.mutate({ id: eventId, newDate })}
              />
            ) : filteredEvents.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-12 text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No events yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first event to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Bulk Actions Toolbar */}
                {filteredEvents.length > 0 && (
                  <div className={cn(
                    "flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border transition-all",
                    selectedEventIds.size > 0 ? "border-primary" : "border-transparent"
                  )}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={selectAllEvents}
                      className="h-8"
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      {selectedEventIds.size === filteredEvents.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    
                    {selectedEventIds.size > 0 && (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {selectedEventIds.size} selected
                        </span>
                        <div className="h-4 w-px bg-border mx-2" />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleBulkDuplicate}
                          disabled={isBulkActionPending}
                          className="h-8"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </Button>
                        <Select onValueChange={(v) => handleBulkStatusChange(v as EventStatus)}>
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue placeholder="Set Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pencilled">Pencilled</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={handleBulkDelete}
                          disabled={isBulkActionPending}
                          className="h-8"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearSelection}
                          className="h-8 ml-auto"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
                
                {filteredEvents.map((event) => (
                  <Card 
                    key={event.id} 
                    className={cn(
                      "glass hover:bg-secondary/30 transition-colors cursor-pointer",
                      selectedEventIds.has(event.id) && "ring-2 ring-primary bg-primary/5"
                    )}
                    onClick={() => handleEventClick(event)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedEventIds.has(event.id)}
                            onClick={(e) => toggleEventSelection(event.id, e)}
                            className="h-5 w-5"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{event.title}</h3>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{event.event_type}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {event.venue_name && `${event.venue_name} • `}
                              {formatEventTime(event)}
                            </p>
                            {event.client_name && <p className="text-sm text-muted-foreground">Client: {event.client_name}</p>}
                            {(() => {
                              const shares = getEventShares(event.id);
                              if (shares.length === 0) return null;
                              return (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                  <div className="flex -space-x-1">
                                    {shares.slice(0, 3).map((share) => (
                                      <div
                                        key={share.id}
                                        className="h-5 w-5 rounded-full bg-primary/20 border border-background flex items-center justify-center"
                                        title={share.shared_with_email || ''}
                                      >
                                        <span className="text-[10px] font-medium text-primary">
                                          {share.shared_with_email?.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    ))}
                                    {shares.length > 3 && (
                                      <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center">
                                        <span className="text-[10px] font-medium text-muted-foreground">
                                          +{shares.length - 3}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {shares.length === 1 ? '1 bandmate' : `${shares.length} bandmates`}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right space-y-1">
                            <p className="font-semibold">{formatCurrency(event.fee)}</p>
                            <div className="flex gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(event.status)}`}>
                                {event.status}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                event.payment_status === 'paid' ? 'bg-success/20 text-success' :
                                event.payment_status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                                'bg-muted text-muted-foreground'
                              }`}>{event.payment_status}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Create invoice"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInvoiceEvent(event);
                              setInvoiceDialogOpen(true);
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <ShareEventDialog 
                            event={event}
                            trigger={
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Share with bandmates"
                                onClick={(e) => e.stopPropagation()}
                              >
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
          </TabsContent>

          <TabsContent value="bin" className="mt-6">
            <DeletedEventsTab
              deletedEvents={deletedEvents}
              onRestore={(id) => restoreEvent.mutateAsync(id)}
              onPermanentDelete={(id) => permanentDeleteEvent.mutateAsync(id)}
              onEmptyBin={() => emptyBin.mutateAsync()}
              isLoading={isLoadingDeleted}
            />
          </TabsContent>
        </Tabs>
      </div>

      <EventDetailDialog
        event={selectedEvent}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        onDuplicate={async (id, newDate) => { await duplicateEvent.mutateAsync({ eventId: id, newDate }); }}
        isPending={updateEvent.isPending}
      />

      <InvoiceCreateDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        fromEvent={invoiceEvent}
      />
    </AppLayout>
  );
}
