import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PinnedAudio } from '@/types/groups';

export function useGroupPinnedAudio(groupId: string) {
  return useQuery({
    queryKey: ['pinned-audio', 'group', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pinned_audio')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PinnedAudio[];
    },
    enabled: !!groupId,
  });
}

export function usePinAudio() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      group_id?: string;
      title: string;
      artist?: string;
      audio_url: string;
      cover_image_url?: string;
      section: string;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('pinned_audio')
        .insert({
          ...data,
          user_id: user.id,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      if (variables.group_id) {
        queryClient.invalidateQueries({ queryKey: ['pinned-audio', 'group', variables.group_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['pinned-audio'] });
      toast.success('Audio pinned!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUnpinAudio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ audioId, groupId }: { audioId: string; groupId?: string }) => {
      const { error } = await supabase
        .from('pinned_audio')
        .update({ is_active: false })
        .eq('id', audioId);
      
      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => {
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: ['pinned-audio', 'group', groupId] });
      }
      queryClient.invalidateQueries({ queryKey: ['pinned-audio'] });
      toast.success('Audio unpinned');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
