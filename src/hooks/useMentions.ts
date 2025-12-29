import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Mention {
  id: string;
  mentioned_user_id: string;
  mentioned_by_user_id: string;
  post_id: string | null;
  comment_id: string | null;
  group_post_id: string | null;
  group_comment_id: string | null;
  created_at: string;
  is_read: boolean;
  mentioned_by?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useMyMentions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-mentions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('mentions')
        .select('*')
        .eq('mentioned_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Fetch profiles of those who mentioned
      const userIds = data.map(m => m.mentioned_by_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(m => ({
        ...m,
        mentioned_by: profileMap.get(m.mentioned_by_user_id),
      })) as Mention[];
    },
    enabled: !!user,
  });
}

export function useUnreadMentionsCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-mentions-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('mentions')
        .select('*', { count: 'exact', head: true })
        .eq('mentioned_user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}

export function useMarkMentionRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mentionId: string) => {
      const { error } = await supabase
        .from('mentions')
        .update({ is_read: true })
        .eq('id', mentionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-mentions'] });
      queryClient.invalidateQueries({ queryKey: ['unread-mentions-count'] });
    },
  });
}

export function useMarkAllMentionsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('mentions')
        .update({ is_read: true })
        .eq('mentioned_user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-mentions'] });
      queryClient.invalidateQueries({ queryKey: ['unread-mentions-count'] });
    },
  });
}

export function useCreateMentions() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      mentionedUserIds,
      postId,
      commentId,
      groupPostId,
      groupCommentId,
    }: {
      mentionedUserIds: string[];
      postId?: string;
      commentId?: string;
      groupPostId?: string;
      groupCommentId?: string;
    }) => {
      if (!user || mentionedUserIds.length === 0) return;
      
      const mentions = mentionedUserIds.map(userId => ({
        mentioned_user_id: userId,
        mentioned_by_user_id: user.id,
        post_id: postId || null,
        comment_id: commentId || null,
        group_post_id: groupPostId || null,
        group_comment_id: groupCommentId || null,
      }));
      
      const { error } = await supabase
        .from('mentions')
        .insert(mentions);
      
      if (error) throw error;
    },
  });
}

// Utility to extract @mentions from text
export function extractMentions(text: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[2]); // The user ID is in the second capture group
  }
  
  return mentions;
}

// Utility to render mentions in text
export function renderMentions(text: string): string {
  return text.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '<span class="text-primary font-medium">@$1</span>');
}
