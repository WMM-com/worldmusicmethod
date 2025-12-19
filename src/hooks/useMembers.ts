import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MemberProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  business_name: string | null;
}

// Fetch all members (for directory)
export function useMembers(searchQuery?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['members', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, business_name')
        .order('full_name', { ascending: true });
      
      if (searchQuery && searchQuery.length >= 2) {
        query = query.or(`full_name.ilike.%${searchQuery}%,business_name.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query.limit(50);
      if (error) throw error;
      
      // Filter out current user
      return (data || []).filter(p => p.id !== user?.id) as MemberProfile[];
    },
    enabled: true,
  });
}

// Fetch single member profile
export function useMemberProfile(userId: string) {
  return useQuery({
    queryKey: ['member-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, business_name, email')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// Check connection status with a user
export function useConnectionStatus(userId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['connection-status', user?.id, userId],
    queryFn: async () => {
      if (!user) return { isFriend: false, pendingRequest: null };
      
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { isFriend: false, pendingRequest: null };
      }
      
      const friendship = data[0];
      if (friendship.status === 'accepted') {
        return { isFriend: true, pendingRequest: null };
      }
      
      return {
        isFriend: false,
        pendingRequest: {
          id: friendship.id,
          sentByMe: friendship.user_id === user.id,
          status: friendship.status,
        },
      };
    },
    enabled: !!user && !!userId,
  });
}

// Connect with user (send friend request)
export function useConnectWithMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (memberId: string) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: memberId,
          status: 'pending',
        });
      
      if (error) throw error;
    },
    onSuccess: (_, memberId) => {
      queryClient.invalidateQueries({ queryKey: ['connection-status', user?.id, memberId] });
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      toast.success('Connection request sent!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
