import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SharedEvent {
  id: string;
  event_id: string;
  shared_by: string;
  shared_with: string | null;
  shared_with_email: string | null;
  can_see_fee: boolean;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
  event?: {
    id: string;
    title: string;
    event_type: string;
    venue_name: string | null;
    venue_address: string | null;
    start_time: string;
    end_time: string | null;
    fee: number;
    status: string;
    payment_status: string;
    notes: string | null;
    client_name: string | null;
  };
  sharer?: {
    full_name: string | null;
    email: string;
  };
}

interface ShareEventParams {
  eventId: string;
  email: string;
  canSeeFee: boolean;
  customFee?: number | null;
}

export function useSharedEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Events I've shared with others
  const sharedByMeQuery = useQuery({
    queryKey: ['shared-events-by-me', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('shared_events')
        .select(`
          id,
          event_id,
          shared_by,
          shared_with,
          shared_with_email,
          can_see_fee,
          acknowledged,
          acknowledged_at,
          created_at
        `)
        .eq('shared_by', user.id);

      if (error) throw error;
      return data as SharedEvent[];
    },
    enabled: !!user,
  });

  // Events shared with me
  const sharedWithMeQuery = useQuery({
    queryKey: ['shared-events-with-me', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get events shared directly with my user ID or my email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      const { data, error } = await supabase
        .from('shared_events')
        .select(`
          id,
          event_id,
          shared_by,
          shared_with,
          shared_with_email,
          can_see_fee,
          acknowledged,
          acknowledged_at,
          created_at
        `)
        .or(`shared_with.eq.${user.id},shared_with_email.eq.${profile?.email || ''}`);

      if (error) throw error;
      
      // Fetch event details for each shared event
      const eventIds = data.map(se => se.event_id);
      const { data: events } = await supabase
        .from('events')
        .select('id, title, event_type, venue_name, venue_address, start_time, end_time, fee, status, payment_status, notes, client_name')
        .in('id', eventIds);

      // Fetch sharer profiles
      const sharerIds = [...new Set(data.map(se => se.shared_by))];
      const { data: sharers } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', sharerIds);

      // Combine the data
      return data.map(se => ({
        ...se,
        event: events?.find(e => e.id === se.event_id),
        sharer: sharers?.find(s => s.id === se.shared_by),
      })) as SharedEvent[];
    },
    enabled: !!user,
  });

  // Share an event
  const shareEvent = useMutation({
    mutationFn: async ({ eventId, email, canSeeFee }: ShareEventParams) => {
      if (!user) throw new Error('Not authenticated');

      // Check if user exists with this email
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      const { data, error } = await supabase
        .from('shared_events')
        .insert({
          event_id: eventId,
          shared_by: user.id,
          shared_with: targetProfile?.id || null,
          shared_with_email: email,
          can_see_fee: canSeeFee,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-events-by-me'] });
      toast.success('Event shared successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to share event: ' + error.message);
    },
  });

  // Unshare an event
  const unshareEvent = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from('shared_events')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-events-by-me'] });
      toast.success('Share removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove share: ' + error.message);
    },
  });

  // Acknowledge a shared event (bandmate confirms they've seen it)
  const acknowledgeEvent = useMutation({
    mutationFn: async (shareId: string) => {
      const { data, error } = await supabase
        .from('shared_events')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', shareId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-events-with-me'] });
      toast.success('Event acknowledged');
    },
    onError: (error: Error) => {
      toast.error('Failed to acknowledge: ' + error.message);
    },
  });

  // Update share settings
  const updateShare = useMutation({
    mutationFn: async ({ shareId, canSeeFee }: { shareId: string; canSeeFee: boolean }) => {
      const { data, error } = await supabase
        .from('shared_events')
        .update({ can_see_fee: canSeeFee })
        .eq('id', shareId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-events-by-me'] });
      toast.success('Share updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update share: ' + error.message);
    },
  });

  // Get shares for a specific event
  const getEventShares = (eventId: string) => {
    return sharedByMeQuery.data?.filter(se => se.event_id === eventId) ?? [];
  };

  return {
    sharedByMe: sharedByMeQuery.data ?? [],
    sharedWithMe: sharedWithMeQuery.data ?? [],
    isLoading: sharedByMeQuery.isLoading || sharedWithMeQuery.isLoading,
    shareEvent,
    unshareEvent,
    acknowledgeEvent,
    updateShare,
    getEventShares,
  };
}
