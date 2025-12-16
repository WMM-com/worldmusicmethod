import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type CalendarProvider = 'google' | 'outlook' | 'yahoo' | 'apple';

interface CalendarConnection {
  id: string;
  user_id: string;
  provider: string;
  calendar_id: string | null;
  connected_at: string;
  updated_at: string;
}

export function useCalendarSync() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  // Fetch connected calendars
  const connectionsQuery = useQuery({
    queryKey: ['calendar-connections', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('id, user_id, provider, calendar_id, connected_at, updated_at')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as CalendarConnection[];
    },
    enabled: !!user,
  });

  // Connect to calendar provider
  const connectCalendar = useMutation({
    mutationFn: async (provider: CalendarProvider) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      // Use environment variable for Supabase URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/calendar-oauth?action=authorize&provider=${provider}`;
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect calendar');
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Open OAuth popup
      const popup = window.open(
        result.authUrl,
        'calendar-oauth',
        'width=600,height=700,popup=true'
      );

      return new Promise((resolve, reject) => {
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'calendar-oauth-success') {
            window.removeEventListener('message', handleMessage);
            resolve(event.data);
          } else if (event.data?.type === 'calendar-oauth-error') {
            window.removeEventListener('message', handleMessage);
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener('message', handleMessage);

        // Check if popup was closed without completing
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
          }
        }, 1000);
      });
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
      toast.success(`${getProviderName(provider)} connected successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Disconnect calendar
  const disconnectCalendar = useMutation({
    mutationFn: async (provider: CalendarProvider) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/calendar-oauth?action=disconnect&provider=${provider}`;
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect calendar');
      }

      return response.json();
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
      toast.success(`${getProviderName(provider)} disconnected`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Sync events to calendar
  const syncEvents = useMutation({
    mutationFn: async ({ provider, startDate }: { provider: CalendarProvider; startDate?: string }) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('calendar-sync', {
        body: {
          action: 'sync_all',
          provider,
          startDate: startDate || new Date().toISOString(),
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, { provider }) => {
      toast.success(`Synced ${data?.data?.synced || 0} events to ${getProviderName(provider)}`);
    },
    onError: (error: Error) => {
      toast.error('Sync failed: ' + error.message);
    },
  });

  // Sync single event
  const syncEvent = useMutation({
    mutationFn: async ({ provider, event }: { provider: CalendarProvider; event: any }) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('calendar-sync', {
        body: {
          action: 'sync_event',
          provider,
          event,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { provider }) => {
      toast.success(`Event synced to ${getProviderName(provider)}`);
    },
    onError: (error: Error) => {
      toast.error('Sync failed: ' + error.message);
    },
  });

  const isConnected = (provider: CalendarProvider) => {
    return connectionsQuery.data?.some(c => c.provider === provider) ?? false;
  };

  const getConnection = (provider: CalendarProvider) => {
    return connectionsQuery.data?.find(c => c.provider === provider);
  };

  return {
    connections: connectionsQuery.data ?? [],
    isLoading: connectionsQuery.isLoading,
    connectCalendar,
    disconnectCalendar,
    syncEvents,
    syncEvent,
    isConnected,
    getConnection,
  };
}

function getProviderName(provider: CalendarProvider): string {
  const names: Record<CalendarProvider, string> = {
    google: 'Google Calendar',
    outlook: 'Outlook Calendar',
    yahoo: 'Yahoo Calendar',
    apple: 'Apple Calendar',
  };
  return names[provider];
}
