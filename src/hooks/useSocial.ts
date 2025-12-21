import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  media_type: string | null;
  post_type?: string | null;
  visibility: string;
  created_at: string;
  updated_at?: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  appreciation_count?: number;
  comment_count?: number;
  user_appreciated?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  appreciation_count?: number;
  user_appreciated?: boolean;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

export function useFeed() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['feed', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;

      // Get profiles, appreciation counts, and comment counts
      const postIds = posts.map(p => p.id);
      const userIds = [...new Set(posts.map(p => p.user_id))];

      const [profilesRes, appreciationsRes, commentsRes, userAppreciationsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
        supabase.from('appreciations').select('post_id').in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds),
        supabase.from('appreciations').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      ]);

      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      const appreciationCounts = new Map<string, number>();
      const commentCounts = new Map<string, number>();
      const userAppreciated = new Set(userAppreciationsRes.data?.map(a => a.post_id) || []);

      appreciationsRes.data?.forEach(a => {
        appreciationCounts.set(a.post_id, (appreciationCounts.get(a.post_id) || 0) + 1);
      });
      commentsRes.data?.forEach(c => {
        commentCounts.set(c.post_id, (commentCounts.get(c.post_id) || 0) + 1);
      });

      return posts.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id),
        appreciation_count: appreciationCounts.get(post.id) || 0,
        comment_count: commentCounts.get(post.id) || 0,
        user_appreciated: userAppreciated.has(post.id),
      })) as Post[];
    },
    enabled: !!user,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ content, mediaUrl, mediaType, visibility, postType }: { 
      content: string; 
      mediaUrl?: string;
      mediaType?: 'image' | 'video' | 'audio' | null;
      visibility: string;
      postType?: 'statement' | 'update' | 'recommendation' | 'practice';
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content,
        image_url: mediaUrl || null,
        media_type: mediaType || null,
        visibility,
        post_type: postType || 'update',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Post shared');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create post');
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, content, mediaUrl, mediaType }: { 
      postId: string;
      content: string; 
      mediaUrl?: string | null;
      mediaType?: 'image' | 'video' | 'audio' | null;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase.from('posts')
        .update({
          content,
          image_url: mediaUrl ?? null,
          media_type: mediaType ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Post updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update post');
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Post deleted');
    },
  });
}

export function useComments(postId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      const userIds = [...new Set(comments.map(c => c.user_id))];
      const commentIds = comments.map(c => c.id);

      const [profilesRes, appreciationsRes, userAppreciationsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
        supabase.from('appreciations').select('comment_id').in('comment_id', commentIds),
        user ? supabase.from('appreciations').select('comment_id').eq('user_id', user.id).in('comment_id', commentIds) : Promise.resolve({ data: [] }),
      ]);

      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      const appreciationCounts = new Map<string, number>();
      const userAppreciated = new Set(userAppreciationsRes.data?.map(a => a.comment_id) || []);

      appreciationsRes.data?.forEach(a => {
        if (a.comment_id) {
          appreciationCounts.set(a.comment_id, (appreciationCounts.get(a.comment_id) || 0) + 1);
        }
      });

      return comments.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id),
        appreciation_count: appreciationCounts.get(comment.id) || 0,
        user_appreciated: userAppreciated.has(comment.id),
      })) as Comment[];
    },
    enabled: !!postId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, content, parentId }: { 
      postId: string; 
      content: string; 
      parentId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_id: parentId || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase.from('comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      toast.success('Comment updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update comment');
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase.from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Comment deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete comment');
    },
  });
}

export function useAppreciate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, commentId, remove }: { 
      postId?: string; 
      commentId?: string; 
      remove: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      if (remove) {
        const query = supabase.from('appreciations').delete().eq('user_id', user.id);
        if (postId) {
          const { error } = await query.eq('post_id', postId);
          if (error) throw error;
        } else if (commentId) {
          const { error } = await query.eq('comment_id', commentId);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from('appreciations').insert({
          user_id: user.id,
          post_id: postId || null,
          comment_id: commentId || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (variables.commentId) {
        queryClient.invalidateQueries({ queryKey: ['comments'] });
      }
    },
  });
}

export function useFriendships() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friendships', user?.id],
    queryFn: async () => {
      if (!user) return { friends: [], pending: [], requests: [] };
      
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      
      if (error) throw error;

      const otherUserIds = data.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', otherUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const friends: Friendship[] = [];
      const pending: Friendship[] = [];
      const requests: Friendship[] = [];

      data.forEach(f => {
        const otherUserId = f.user_id === user.id ? f.friend_id : f.user_id;
        const friendship = {
          ...f,
          profiles: profilesMap.get(otherUserId),
        };

        if (f.status === 'accepted') {
          friends.push(friendship);
        } else if (f.user_id === user.id) {
          pending.push(friendship);
        } else {
          requests.push(friendship);
        }
      });

      return { friends, pending, requests };
    },
    enabled: !!user,
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase.from('friendships').insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      toast.success('Friend request sent');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send request');
    },
  });
}

export function useRespondToFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ friendshipId, accept }: { friendshipId: string; accept: boolean }) => {
      if (accept) {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', friendshipId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('id', friendshipId);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      toast.success(variables.accept ? 'Friend request accepted' : 'Friend request declined');
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      toast.success('Friend removed');
    },
  });
}

export function useSearchUsers(query: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['search-users', query],
    queryFn: async () => {
      if (!user || !query || query.length < 2) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .neq('id', user.id)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && query.length >= 2,
  });
}
