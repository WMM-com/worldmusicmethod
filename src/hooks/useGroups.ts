import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  Group, GroupMember, GroupPost, GroupPostComment, 
  GroupJoinRequest, GroupEvent, GroupPoll, GroupInvite,
  GroupPrivacy, GroupCategory, GroupMemberRole
} from '@/types/groups';

// Fetch all groups the user can see
export function useGroups(searchQuery?: string, category?: GroupCategory) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['groups', searchQuery, category, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,subcategory.ilike.%${searchQuery}%`);
      }
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Get member counts
      const groupIds = data.map(g => g.id);
      const { data: memberCounts } = await supabase
        .from('group_members')
        .select('group_id')
        .in('group_id', groupIds);
      
      const countMap = new Map<string, number>();
      memberCounts?.forEach(m => {
        countMap.set(m.group_id, (countMap.get(m.group_id) || 0) + 1);
      });
      
      // Check user membership
      let userMemberships = new Set<string>();
      if (user) {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);
        userMemberships = new Set(memberships?.map(m => m.group_id) || []);
      }
      
      return data.map(g => ({
        ...g,
        settings: g.settings as unknown as Group['settings'],
        member_count: countMap.get(g.id) || 0,
        is_member: userMemberships.has(g.id),
      })) as Group[];
    },
    enabled: true,
  });
}

// Fetch user's groups
export function useMyGroups() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: memberships, error } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user.id);
      
      if (error) throw error;
      if (!memberships?.length) return [];
      
      const groupIds = memberships.map(m => m.group_id);
      const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);
      
      const roleMap = new Map(memberships.map(m => [m.group_id, m.role]));
      
      return (groups || []).map(g => ({
        ...g,
        user_role: roleMap.get(g.id),
      }));
    },
    enabled: !!user,
  });
}

// Fetch single group
export function useGroup(groupId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      
      if (error) throw error;
      
      // Get member count
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);
      
      // Check user membership
      let is_member = false;
      let user_role: GroupMemberRole | null = null;
      if (user) {
        const { data: membership } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle();
        is_member = !!membership;
        user_role = membership?.role as GroupMemberRole | null;
      }
      
      return {
        ...data,
        settings: data.settings as unknown as Group['settings'],
        member_count: count || 0,
        is_member,
        user_role,
      } as Group & { user_role: GroupMemberRole | null };
    },
    enabled: !!groupId,
  });
}

// Create group
export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      cover_image_url?: string;
      category: GroupCategory;
      subcategory?: string;
      privacy: GroupPrivacy;
      location?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          ...data,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add creator as admin
      await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin',
        });
      
      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      toast.success('Group created!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Update group
export function useUpdateGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ groupId, updates }: { 
      groupId: string; 
      updates: { 
        name?: string; 
        description?: string; 
        cover_image_url?: string;
        rules?: string;
        welcome_message?: string;
        settings?: Record<string, boolean | string>;
      } 
    }) => {
      const { error } = await supabase
        .from('groups')
        .update(updates as Parameters<typeof supabase.from<'groups'>>[0])
        .eq('id', groupId);
      
      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Join group (public)
export function useJoinGroup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
      toast.success('Joined group!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Leave group
export function useLeaveGroup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
      toast.success('Left group');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Request to join (private groups)
export function useRequestToJoin() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ groupId, message }: { groupId: string; message?: string }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('group_join_requests')
        .insert({
          group_id: groupId,
          user_id: user.id,
          message,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      toast.success('Join request sent!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Fetch group members
export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });
      
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return members.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id),
      })) as GroupMember[];
    },
    enabled: !!groupId,
  });
}

// Fetch group posts
export function useGroupPosts(groupId: string) {
  return useQuery({
    queryKey: ['group-posts', groupId],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from('group_posts')
        .select('*')
        .eq('group_id', groupId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles
      const userIds = [...new Set(posts.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      // Fetch comment counts
      const postIds = posts.map(p => p.id);
      const { data: comments } = await supabase
        .from('group_post_comments')
        .select('post_id')
        .in('post_id', postIds);
      
      const commentCountMap = new Map<string, number>();
      comments?.forEach(c => {
        commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1);
      });
      
      return posts.map(p => ({
        ...p,
        profile: profileMap.get(p.user_id),
        comment_count: commentCountMap.get(p.id) || 0,
      })) as GroupPost[];
    },
    enabled: !!groupId,
  });
}

// Create group post
export function useCreateGroupPost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      group_id: string;
      content: string;
      media_url?: string;
      media_type?: string;
      is_announcement?: boolean;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('group_posts')
        .insert({
          ...data,
          user_id: user.id,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', variables.group_id] });
      toast.success('Post created!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Fetch post comments
export function useGroupPostComments(postId: string) {
  return useQuery({
    queryKey: ['group-post-comments', postId],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('group_post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Fetch profiles
      const userIds = [...new Set(comments.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return comments.map(c => ({
        ...c,
        profile: profileMap.get(c.user_id),
      })) as GroupPostComment[];
    },
    enabled: !!postId,
  });
}

// Create comment
export function useCreateGroupPostComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('group_post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-post-comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
      toast.success('Comment added!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Fetch join requests (for admins)
export function useGroupJoinRequests(groupId: string) {
  return useQuery({
    queryKey: ['group-join-requests', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles
      const userIds = data.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id),
      })) as GroupJoinRequest[];
    },
    enabled: !!groupId,
  });
}

// Handle join request
export function useHandleJoinRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      requestId, 
      groupId, 
      userId, 
      approve 
    }: { 
      requestId: string; 
      groupId: string; 
      userId: string; 
      approve: boolean; 
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({
          status: approve ? 'approved' : 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      
      if (updateError) throw updateError;
      
      if (approve) {
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: userId,
            role: 'member',
          });
        
        if (memberError) throw memberError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-join-requests', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', variables.groupId] });
      toast.success(variables.approve ? 'Member approved!' : 'Request declined');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Fetch user's invites
export function useMyGroupInvites() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-group-invites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('group_invites')
        .select(`
          *,
          group:groups(id, name, cover_image_url)
        `)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      return data as GroupInvite[];
    },
    enabled: !!user,
  });
}

// Respond to invite
export function useRespondToInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ inviteId, groupId, accept }: { inviteId: string; groupId: string; accept: boolean }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error: updateError } = await supabase
        .from('group_invites')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', inviteId);
      
      if (updateError) throw updateError;
      
      if (accept) {
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: user.id,
            role: 'member',
          });
        
        if (memberError) throw memberError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-group-invites'] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      toast.success(variables.accept ? 'Joined group!' : 'Invite declined');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Create group event
export function useCreateGroupEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      group_id: string;
      title: string;
      description?: string;
      event_type?: string;
      location?: string;
      start_time: string;
      end_time?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('group_events')
        .insert({
          ...data,
          created_by: user.id,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-events', variables.group_id] });
      toast.success('Event created!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Fetch group events
export function useGroupEvents(groupId: string) {
  return useQuery({
    queryKey: ['group-events', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_events')
        .select('*')
        .eq('group_id', groupId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data as GroupEvent[];
    },
    enabled: !!groupId,
  });
}

// Create poll
export function useCreateGroupPoll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      group_id: string;
      question: string;
      options: string[];
      ends_at?: string;
      is_multiple_choice?: boolean;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('group_polls')
        .insert({
          ...data,
          options: JSON.stringify(data.options),
          created_by: user.id,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-polls', variables.group_id] });
      toast.success('Poll created!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Fetch group polls
export function useGroupPolls(groupId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['group-polls', groupId],
    queryFn: async () => {
      const { data: polls, error } = await supabase
        .from('group_polls')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch votes
      const pollIds = polls.map(p => p.id);
      const { data: allVotes } = await supabase
        .from('group_poll_votes')
        .select('poll_id, option_index, user_id')
        .in('poll_id', pollIds);
      
      return polls.map(p => {
        const pollVotes = allVotes?.filter(v => v.poll_id === p.id) || [];
        const voteCounts = new Map<number, number>();
        pollVotes.forEach(v => {
          voteCounts.set(v.option_index, (voteCounts.get(v.option_index) || 0) + 1);
        });
        
        const options = typeof p.options === 'string' ? JSON.parse(p.options) : p.options;
        
        return {
          ...p,
          options,
          votes: Array.from(voteCounts.entries()).map(([option_index, count]) => ({ option_index, count })),
          user_votes: pollVotes.filter(v => v.user_id === user?.id).map(v => v.option_index),
        };
      }) as GroupPoll[];
    },
    enabled: !!groupId,
  });
}

// Vote on poll
export function useVoteOnPoll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ pollId, optionIndex, groupId }: { pollId: string; optionIndex: number; groupId: string }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('group_poll_votes')
        .insert({
          poll_id: pollId,
          user_id: user.id,
          option_index: optionIndex,
        });
      
      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['group-polls', groupId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
