import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface GroupChannel {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  icon: string;
  order_index: number;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export function useGroupChannels(groupId: string) {
  return useQuery({
    queryKey: ['group-channels', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_channels')
        .select('*')
        .eq('group_id', groupId)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data as GroupChannel[];
    },
    enabled: !!groupId,
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      group_id: string;
      name: string;
      description?: string;
      icon?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data: channel, error } = await supabase
        .from('group_channels')
        .insert({
          ...data,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return channel;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-channels', variables.group_id] });
      toast.success('Channel created!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, groupId, updates }: {
      channelId: string;
      groupId: string;
      updates: Partial<Pick<GroupChannel, 'name' | 'description' | 'icon' | 'order_index'>>;
    }) => {
      const { error } = await supabase
        .from('group_channels')
        .update(updates)
        .eq('id', channelId);
      
      if (error) throw error;
      return channelId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-channels', variables.groupId] });
      toast.success('Channel updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, groupId }: { channelId: string; groupId: string }) => {
      const { error } = await supabase
        .from('group_channels')
        .delete()
        .eq('id', channelId);
      
      if (error) throw error;
      return channelId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-channels', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-posts', variables.groupId] });
      toast.success('Channel deleted!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
