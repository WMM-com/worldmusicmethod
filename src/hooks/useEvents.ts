import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Event, EventType, EventStatus, PaymentStatus } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Active events (not deleted)
  const eventsQuery = useQuery({
    queryKey: ['events', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data as Event[];
    },
    enabled: !!user,
  });

  // Deleted events (bin)
  const deletedEventsQuery = useQuery({
    queryKey: ['events', 'deleted', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      return data as Event[];
    },
    enabled: !!user,
  });

  const createEvent = useMutation({
    mutationFn: async (event: Omit<Event, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'share_token'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('events')
        .insert({
          ...event,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create event: ' + error.message);
    },
  });

  // Create multiple recurring events
  const createRecurringEvents = useMutation({
    mutationFn: async (events: Array<{
      title: string;
      start_time: string;
      event_type?: EventType;
      venue_name?: string | null;
      venue_address?: string | null;
      client_name?: string | null;
      client_email?: string | null;
      client_phone?: string | null;
      fee?: number;
      currency?: string;
      end_time?: string | null;
      arrival_time?: string | null;
      notes?: string | null;
      status?: EventStatus;
      payment_status?: PaymentStatus;
      payment_date?: string | null;
      tags?: string[] | null;
      time_tbc?: boolean;
      is_recurring?: boolean;
    }>) => {
      if (!user) throw new Error('Not authenticated');

      const eventsWithUser = events.map(event => ({
        title: event.title,
        event_type: event.event_type || 'gig',
        venue_name: event.venue_name || null,
        venue_address: event.venue_address || null,
        client_name: event.client_name || null,
        client_email: event.client_email || null,
        client_phone: event.client_phone || null,
        fee: event.fee || 0,
        currency: event.currency || 'GBP',
        start_time: event.start_time,
        end_time: event.end_time || null,
        arrival_time: event.arrival_time || null,
        notes: event.notes || null,
        status: event.status || 'pending',
        payment_status: event.payment_status || 'unpaid',
        payment_date: event.payment_date || null,
        tags: event.tags || null,
        time_tbc: event.time_tbc || false,
        is_recurring: event.is_recurring ?? true,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from('events')
        .insert(eventsWithUser)
        .select();

      if (error) throw error;
      return data as Event[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`${data.length} recurring events created`);
    },
    onError: (error) => {
      toast.error('Failed to create recurring events: ' + error.message);
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Event> & { id: string }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update event: ' + error.message);
    },
  });

  // Reschedule event (update date while preserving time)
  const rescheduleEvent = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: Date }) => {
      // First fetch the event to get the original time
      const { data: original, error: fetchError } = await supabase
        .from('events')
        .select('start_time')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!original) throw new Error('Event not found');

      // Preserve the original time while updating the date
      const originalDate = new Date(original.start_time);
      const updatedDate = new Date(newDate);
      updatedDate.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds());

      const { data, error } = await supabase
        .from('events')
        .update({ start_time: updatedDate.toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event rescheduled');
    },
    onError: (error) => {
      toast.error('Failed to reschedule event: ' + error.message);
    },
  });

  // Soft delete - move to bin
  const softDeleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event moved to bin');
    },
    onError: (error) => {
      toast.error('Failed to delete event: ' + error.message);
    },
  });

  // Restore from bin
  const restoreEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event restored');
    },
    onError: (error) => {
      toast.error('Failed to restore event: ' + error.message);
    },
  });

  // Permanent delete
  const permanentDeleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event permanently deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete event: ' + error.message);
    },
  });

  // Empty bin - delete all soft-deleted events
  const emptyBin = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Bin emptied');
    },
    onError: (error) => {
      toast.error('Failed to empty bin: ' + error.message);
    },
  });

  // Bulk soft delete
  const bulkSoftDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`${ids.length} events moved to bin`);
    },
    onError: (error) => {
      toast.error('Failed to delete events: ' + error.message);
    },
  });

  // Bulk update status
  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: EventStatus }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('events')
        .update({ status })
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`${ids.length} events updated`);
    },
    onError: (error) => {
      toast.error('Failed to update events: ' + error.message);
    },
  });

  // Bulk duplicate
  const bulkDuplicate = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user) throw new Error('Not authenticated');
      
      // Fetch all events to duplicate
      const { data: originals, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .in('id', ids)
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;
      if (!originals || originals.length === 0) throw new Error('No events found');

      // Create copies
      const copies = originals.map(original => {
        const { id, created_at, updated_at, share_token, deleted_at, ...eventData } = original;
        return {
          ...eventData,
          title: `${eventData.title} (Copy)`,
          user_id: user.id,
        };
      });

      const { data, error } = await supabase
        .from('events')
        .insert(copies)
        .select();

      if (error) throw error;
      return data as Event[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`${data.length} events duplicated`);
    },
    onError: (error) => {
      toast.error('Failed to duplicate events: ' + error.message);
    },
  });

  // Duplicate event
  const duplicateEvent = useMutation({
    mutationFn: async ({ eventId, newDate }: { eventId: string; newDate?: Date }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Fetch the original event
      const { data: original, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!original) throw new Error('Event not found');

      // Create a copy without id, timestamps, and share_token
      const { id, created_at, updated_at, share_token, deleted_at, ...eventData } = original;
      
      // If a new date is provided, update the start_time while preserving the original time
      let newStartTime = eventData.start_time;
      if (newDate) {
        const originalDate = new Date(eventData.start_time);
        const updatedDate = new Date(newDate);
        updatedDate.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds());
        newStartTime = updatedDate.toISOString();
      }
      
      const { data, error } = await supabase
        .from('events')
        .insert({
          ...eventData,
          title: `${eventData.title} (Copy)`,
          start_time: newStartTime,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event duplicated');
    },
    onError: (error) => {
      toast.error('Failed to duplicate event: ' + error.message);
    },
  });

  return {
    events: eventsQuery.data ?? [],
    deletedEvents: deletedEventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    isLoadingDeleted: deletedEventsQuery.isLoading,
    error: eventsQuery.error,
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
  };
}

export function useUpcomingEvents(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['events', 'upcoming', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as Event[];
    },
    enabled: !!user,
  });
}
