import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createNotification } from '@/hooks/useNotifications';
import { sanitizeIdentifier, sanitizeSearchQuery } from '@/lib/sanitize';
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
    username?: string | null;
    email_verified?: boolean | null;
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
    username?: string | null;
    email_verified?: boolean | null;
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
  other_user_id?: string; // Computed field for convenience
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
    username: string | null;
    email_verified?: boolean | null;
  };
}

export function useFeed() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['feed', user?.id ?? 'public'],
    queryFn: async () => {
      // Public (logged-out) feed: only public posts, read-only.
      if (!user) {
        const { data: posts, error } = await supabase
          .from('posts')
          .select('*')
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        const userIds = [...new Set((posts || []).map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username, email_verified')
          .in('id', userIds);

        const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

        return (posts || []).map(post => ({
          ...post,
          profiles: profilesMap.get(post.user_id),
        })) as Post[];
      }

      // Authenticated feed (existing behavior)
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
        supabase.from('profiles').select('id, full_name, avatar_url, username, email_verified').in('id', userIds),
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
    enabled: true,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ content, mediaUrl, mediaType, visibility, postType }: { 
      content: string; 
      mediaUrl?: string;
      mediaType?: 'image' | 'video' | 'audio' | null;
      visibility: string;
      postType?: 'statement' | 'update' | 'recommendation' | 'practice';
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data: post, error } = await supabase.from('posts').insert({
        user_id: user.id,
        content,
        image_url: mediaUrl || null,
        media_type: mediaType || null,
        visibility,
        post_type: postType || 'update',
      }).select('id').single();
      if (error) throw error;
      
      // Extract and create mention notifications
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        const mentionedUserId = match[2];
        if (mentionedUserId !== user.id) {
          await createNotification({
            userId: mentionedUserId,
            type: 'mention',
            title: 'You were mentioned',
            message: `${profile?.full_name || 'Someone'} mentioned you in a post`,
            referenceId: post.id,
            referenceType: 'post',
            fromUserId: user.id,
          });
        }
      }
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
      // First, fetch the post to get media URL for R2 cleanup
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('image_url, user_id')
        .eq('id', postId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Failed to fetch post for deletion:', fetchError);
      }

      // Delete from R2 if there's media
      if (post?.image_url) {
        try {
          // Extract object key from URL - format: https://pub-xxx.r2.dev/userId/posts/type/filename
          const url = new URL(post.image_url);
          const objectKey = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
          
          if (objectKey) {
            const { error: r2Error } = await supabase.functions.invoke('r2-delete', {
              body: { objectKey, bucket: 'user' }
            });
            
            if (r2Error) {
              console.error('Failed to delete media from R2:', r2Error);
              // Continue with database deletion even if R2 fails
            } else {
              console.log('R2 media deleted:', objectKey);
            }
            
            // Also delete from media_library to clean up orphaned records
            await supabase
              .from('media_library')
              .delete()
              .eq('file_url', post.image_url);
          }
        } catch (err) {
          console.error('Error parsing media URL for R2 deletion:', err);
        }
      }

      // Admin can delete any post via RLS policy, owner can delete their own
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
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
        supabase.from('profiles').select('id, full_name, avatar_url, username, email_verified').in('id', userIds),
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
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, content, parentId, mediaUrl, mediaType }: { 
      postId: string; 
      content: string; 
      parentId?: string;
      mediaUrl?: string;
      mediaType?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if user has a private profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('visibility')
        .eq('id', user.id)
        .single();
      
      if (userProfile?.visibility === 'private') {
        throw new Error('Private profiles cannot comment. Please change your profile visibility in Account Settings.');
      }
      
      const { data: comment, error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_id: parentId || null,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      }).select().single();
      if (error) throw error;
      
        // Get the post owner to notify them
        const { data: post } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .single();

        if (post && post.user_id !== user.id) {
          const preview = content
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 140);

          await createNotification({
            userId: post.user_id,
            type: 'comment',
            title: 'New Comment',
            message: `${profile?.full_name || 'Someone'} commented: “${preview}${content.trim().length > 140 ? '…' : ''}”`,
            referenceId: postId,
            referenceType: 'post',
            fromUserId: user.id,
          });
        }
      
      return comment;
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

  return useMutation({
    mutationFn: async (commentId: string) => {
      // First, fetch the comment to get media URL for R2 cleanup
      const { data: comment, error: fetchError } = await supabase
        .from('comments')
        .select('media_url')
        .eq('id', commentId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Failed to fetch comment for deletion:', fetchError);
      }

      // Delete from R2 if there's media
      if (comment?.media_url) {
        try {
          const url = new URL(comment.media_url);
          const objectKey = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
          
          if (objectKey) {
            const { error: r2Error } = await supabase.functions.invoke('r2-delete', {
              body: { objectKey, bucket: 'user' }
            });
            
            if (r2Error) {
              console.error('Failed to delete comment media from R2:', r2Error);
            } else {
              console.log('R2 comment media deleted:', objectKey);
            }
            
            // Also delete from media_library to clean up orphaned records
            await supabase
              .from('media_library')
              .delete()
              .eq('file_url', comment.media_url);
          }
        } catch (err) {
          console.error('Error parsing comment media URL for R2 deletion:', err);
        }
      }

      // Admin can delete any comment via RLS policy, owner can delete their own
      const { error } = await supabase.from('comments')
        .delete()
        .eq('id', commentId);
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
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, commentId, remove }: { 
      postId?: string; 
      commentId?: string; 
      remove: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if user has a private profile (only for adding appreciation, not removing)
      if (!remove) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('visibility')
          .eq('id', user.id)
          .single();
        
        if (userProfile?.visibility === 'private') {
          throw new Error('Private profiles cannot appreciate posts. Please change your profile visibility in Account Settings.');
        }
      }
      
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

        // Create notification for appreciation (only when adding, not removing)
        if (postId) {
          const { data: post } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', postId)
            .single();
          
          if (post && post.user_id !== user.id) {
            await createNotification({
              userId: post.user_id,
              type: 'appreciation',
              title: 'New Appreciation',
              message: `${profile?.full_name || 'Someone'} appreciated your post`,
              referenceId: postId,
              referenceType: 'post',
              fromUserId: user.id,
            });
          }
        } else if (commentId) {
          const { data: comment } = await supabase
            .from('comments')
            .select('user_id, post_id')
            .eq('id', commentId)
            .single();
          
          if (comment && comment.user_id !== user.id) {
            await createNotification({
              userId: comment.user_id,
              type: 'appreciation',
              title: 'New Appreciation',
              message: `${profile?.full_name || 'Someone'} appreciated your comment`,
              referenceId: comment.post_id,
              referenceType: 'post',
              fromUserId: user.id,
            });
          }
        }
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
      
      const safeUserId = sanitizeIdentifier(user.id);
      
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${safeUserId},friend_id.eq.${safeUserId}`);
      
      if (error) throw error;

      const otherUserIds = data.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, username, email_verified')
        .in('id', otherUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const friends: Friendship[] = [];
      const pending: Friendship[] = [];
      const requests: Friendship[] = [];

      data.forEach(f => {
        const otherUserId = f.user_id === user.id ? f.friend_id : f.user_id;
        const friendship = {
          ...f,
          other_user_id: otherUserId, // Add computed other user ID for easy access
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
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.from('friendships').insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending',
      }).select().single();
      if (error) throw error;
      
      // Create notification for the recipient
      await createNotification({
        userId: friendId,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${profile?.full_name || 'Someone'} sent you a friend request`,
        referenceId: data.id,
        referenceType: 'friendship',
        fromUserId: user.id,
      });
      
      return data;
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
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ friendshipId, accept }: { friendshipId: string; accept: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get the friendship to find the sender
      const { data: friendship, error: fetchError } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', friendshipId)
        .single();
        
      if (fetchError) throw fetchError;
      
      if (accept) {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', friendshipId);
        if (error) throw error;
        
        // Notify the original sender that their request was accepted
        await createNotification({
          userId: friendship.user_id,
          type: 'friend_accepted',
          title: 'Friend Request Accepted',
          message: `${profile?.full_name || 'Someone'} accepted your friend request`,
          referenceId: friendshipId,
          referenceType: 'friendship',
          fromUserId: user.id,
        });
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
    onError: (error: any) => {
      console.error('Friend request response error:', error);
      toast.error(error.message || 'Failed to respond to friend request');
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

export function useCancelFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      // Use the secure RPC function that deletes both the friendship and the recipient's notification
      const { data, error } = await supabase.rpc('retract_friend_request', {
        p_friendship_id: friendshipId,
      });
      
      if (error) throw error;
      if (!data) throw new Error('Could not cancel request');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Friend request cancelled');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel request');
    },
  });
}

export function useSearchUsers(query: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['search-users', query],
    queryFn: async () => {
      if (!user || !query || query.length < 2) return [];
      
      const safeQuery = sanitizeSearchQuery(query);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, username, email_verified')
        .neq('id', user.id)
        .or(`full_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`)
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && query.length >= 2,
  });
}
