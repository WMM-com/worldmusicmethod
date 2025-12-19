import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SearchUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  is_member: boolean;
  is_invited: boolean;
}

interface PendingInvite {
  id: string;
  group_id: string;
  invited_user_id: string;
  invited_by: string;
  created_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useSearchUsers(query: string, groupId: string) {
  return useQuery({
    queryKey: ['search-users-for-invite', query, groupId],
    queryFn: async () => {
      if (query.length < 2) return [];
      
      // Search users
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(20);
      
      if (error) throw error;
      
      // Get existing members
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);
      
      const memberIds = new Set(members?.map(m => m.user_id) || []);
      
      // Get pending invites
      const { data: invites } = await supabase
        .from('group_invites')
        .select('invited_user_id')
        .eq('group_id', groupId)
        .eq('status', 'pending');
      
      const invitedIds = new Set(invites?.map(i => i.invited_user_id) || []);
      
      return profiles.map(p => ({
        ...p,
        is_member: memberIds.has(p.id),
        is_invited: invitedIds.has(p.id),
      })) as SearchUser[];
    },
    enabled: query.length >= 2,
  });
}

export function useGroupPendingInvites(groupId: string) {
  return useQuery({
    queryKey: ['group-pending-invites', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_invites')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles
      const userIds = data.map(i => i.invited_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(i => ({
        ...i,
        profile: profileMap.get(i.invited_user_id),
      })) as PendingInvite[];
    },
    enabled: !!groupId,
  });
}

export function useInviteToGroup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('group_invites')
        .insert({
          group_id: groupId,
          invited_user_id: userId,
          invited_by: user.id,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-pending-invites', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['search-users-for-invite'] });
      toast.success('Invitation sent!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCancelInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ inviteId, groupId }: { inviteId: string; groupId: string }) => {
      const { error } = await supabase
        .from('group_invites')
        .update({ status: 'declined' })
        .eq('id', inviteId);
      
      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['group-pending-invites', groupId] });
      toast.success('Invitation cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
