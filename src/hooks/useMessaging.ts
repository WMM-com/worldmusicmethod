import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect, useCallback } from 'react';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  metadata: Record<string, any>;
  read_at: string | null;
  created_at: string;
  sender_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface Conversation {
  id: string;
  participant_ids: string[];
  last_message_at: string;
  created_at: string;
  participants?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }[];
  last_message?: Message;
  unread_count?: number;
}

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // First get blocked users
      const { data: blockedData } = await supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);
      
      const blockedIds = new Set(blockedData?.map(b => b.blocked_id) || []);

      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [user.id])
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Filter out conversations with blocked users
      const filteredConversations = conversations.filter(conv => {
        const otherParticipants = conv.participant_ids.filter((id: string) => id !== user.id);
        return !otherParticipants.some((id: string) => blockedIds.has(id));
      });

      const allParticipantIds = [...new Set(filteredConversations.flatMap(c => c.participant_ids))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', allParticipantIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const conversationsWithDetails = await Promise.all(
        filteredConversations.map(async (conv) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          return {
            ...conv,
            participants: conv.participant_ids
              .filter((id: string) => id !== user.id)
              .map((id: string) => profilesMap.get(id))
              .filter(Boolean),
            last_message: lastMessage,
            unread_count: count || 0,
          };
        })
      );

      return conversationsWithDetails as Conversation[];
    },
    enabled: !!user,
  });
}

// Completely rebuilt unread message count hook
export function useUnreadMessageCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['unread-messages-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      // Get all conversations for this user
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user.id]);

      if (!conversations || conversations.length === 0) return 0;

      const conversationIds = conversations.map(c => c.id);

      // Count unread messages (not sent by user, read_at is null)
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }
      
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  // Listen for realtime message updates to refresh count
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-messages-global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Refetch unread count whenever any message changes
          queryClient.invalidateQueries({ queryKey: ['unread-messages-count', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

export function useMessages(conversationId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return messages.map(m => ({
        ...m,
        sender_profile: profilesMap.get(m.sender_id),
      })) as Message[];
    },
    enabled: !!conversationId && !!user,
  });

  // Subscribe to realtime updates for this conversation
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          if (user?.id) {
            queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
            queryClient.invalidateQueries({ queryKey: ['unread-messages-count', user.id] });
          } else {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, user?.id]);

  // Mark messages as read when viewing conversation
  const markAsRead = useCallback(async () => {
    if (!user || !conversationId) return;

    try {
      // Use the security-definer RPC function to mark messages as read
      const { error } = await supabase.rpc('mark_messages_read', {
        conversation_id: conversationId,
      });
      
      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }

      // Force immediate refetch of all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['unread-messages-count', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['conversations', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] }),
      ]);
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, [user, conversationId, queryClient]);

  // Mark messages as read whenever a conversation is opened
  useEffect(() => {
    if (!user || !conversationId) return;

    const t = window.setTimeout(() => {
      markAsRead();
    }, 250);

    return () => window.clearTimeout(t);
  }, [user, conversationId, markAsRead]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      messageType = 'text',
      metadata = {},
    }: {
      conversationId: string;
      content: string;
      messageType?: string;
      metadata?: Record<string, any>;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: messageType,
        metadata,
      });

      if (messageError) throw messageError;

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send message');
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (participantId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user.id, participantId]);

      if (existing && existing.length > 0) {
        for (const conv of existing) {
          const { data } = await supabase
            .from('conversations')
            .select('participant_ids')
            .eq('id', conv.id)
            .single();
          
          if (data?.participant_ids.length === 2 &&
              data.participant_ids.includes(user.id) &&
              data.participant_ids.includes(participantId)) {
            return conv.id;
          }
        }
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_ids: [user.id, participantId],
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useAvailabilityTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['availability-templates', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('availability_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateAvailabilityTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, slots }: { name: string; slots: any[] }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('availability_templates').insert({
        user_id: user.id,
        name,
        slots,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-templates'] });
      toast.success('Template saved');
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      const { error } = await supabase.functions.invoke('delete-message', {
        body: { messageId },
      });
      if (error) throw error;
      return conversationId;
    },
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Message deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete message');
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.functions.invoke('delete-conversation', {
        body: { conversationId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversation deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete conversation');
    },
  });
}
