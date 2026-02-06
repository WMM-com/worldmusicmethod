import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UsernameResolution {
  found: boolean;
  user_id?: string;
  username?: string;
  is_redirect?: boolean;
}

export function useResolveUsername(username?: string) {
  return useQuery({
    queryKey: ['resolve-username', username],
    queryFn: async () => {
      if (!username) return null;

      const { data, error } = await supabase
        .rpc('resolve_username', { p_username: username });

      if (error) throw error;
      return data as unknown as UsernameResolution;
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
  });
}

export function useChangeUsername() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newUsername: string) => {
      const { data, error } = await supabase
        .rpc('change_username', { p_new_username: newUsername });

      if (error) throw error;
      return data as unknown as { success: boolean; error?: string; username?: string; old_username?: string; message?: string };
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['extended-profile'] });
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        if (data.old_username) {
          queryClient.invalidateQueries({ queryKey: ['resolve-username', data.old_username] });
        }
        if (data.username) {
          queryClient.invalidateQueries({ queryKey: ['resolve-username', data.username] });
        }
      }
    },
  });
}
