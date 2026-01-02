import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useR2Upload } from '@/hooks/useR2Upload';
import { toast } from 'sonner';
import { sanitizeIdentifier } from '@/lib/sanitize';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  business_name: string | null;
  created_at: string;
}

export function useUserProfile(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery({
    queryKey: ['profile', targetId],
    queryFn: async () => {
      if (!targetId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, bio, business_name, created_at')
        .eq('id', targetId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!targetId,
  });
}

export function useUserPosts(userId: string) {
  return useQuery({
    queryKey: ['user-posts', userId],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get appreciation and comment counts
      const postIds = posts.map(p => p.id);

      const [appreciationsRes, commentsRes] = await Promise.all([
        supabase.from('appreciations').select('post_id').in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds),
      ]);

      const appreciationCounts = new Map<string, number>();
      const commentCounts = new Map<string, number>();

      appreciationsRes.data?.forEach(a => {
        appreciationCounts.set(a.post_id!, (appreciationCounts.get(a.post_id!) || 0) + 1);
      });
      commentsRes.data?.forEach(c => {
        commentCounts.set(c.post_id, (commentCounts.get(c.post_id) || 0) + 1);
      });

      return posts.map(post => ({
        ...post,
        appreciation_count: appreciationCounts.get(post.id) || 0,
        comment_count: commentCounts.get(post.id) || 0,
      }));
    },
    enabled: !!userId,
  });
}

export function useUpdateBio() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (bio: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ bio })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Bio updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update bio');
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { uploadFile } = useR2Upload();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated');

      // Upload to R2 with avatar optimization
      const result = await uploadFile(file, {
        bucket: 'user',
        folder: 'avatars',
        imageOptimization: 'avatar',
        trackInDatabase: true,
        altText: `${user.email}'s avatar`,
      });

      if (!result) {
        throw new Error('Failed to upload avatar');
      }

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: result.url })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return result.url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      toast.success('Avatar updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload avatar');
    },
  });
}

export function useUserStats(userId: string) {
  return useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      const safeUserId = sanitizeIdentifier(userId);
      
      const [postsRes, friendsRes] = await Promise.all([
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .or(`user_id.eq.${safeUserId},friend_id.eq.${safeUserId}`)
          .eq('status', 'accepted'),
      ]);

      return {
        posts: postsRes.count || 0,
        friends: friendsRes.count || 0,
      };
    },
    enabled: !!userId,
  });
}
