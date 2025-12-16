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
    updateEvent,
    softDeleteEvent,
    restoreEvent,
    duplicateEvent,
    permanentDeleteEvent,
    emptyBin,
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
