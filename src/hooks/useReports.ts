import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ReportReason = 'too_negative' | 'annoying' | 'using_ai' | 'spam' | 'harassment' | 'other';
export type ReportType = 'user' | 'post' | 'message';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
  report_type: ReportType;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'too_negative', label: 'Too Negative' },
  { value: 'annoying', label: 'Annoying' },
  { value: 'using_ai', label: 'Using A.I' },
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'other', label: 'Other' },
];

export function useCreateReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      reportType,
      reason,
      reportedUserId,
      reportedPostId,
      details,
    }: {
      reportType: ReportType;
      reason: ReportReason;
      reportedUserId?: string;
      reportedPostId?: string;
      details?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        report_type: reportType,
        reason,
        reported_user_id: reportedUserId || null,
        reported_post_id: reportedPostId || null,
        details: details || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report submitted. Thank you for helping keep our community safe.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit report');
    },
  });
}

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Report[];
    },
  });
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      reportId,
      status,
    }: {
      reportId: string;
      status: ReportStatus;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('reports')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report updated');
    },
  });
}

// User blocks
export function useBlockUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('user_blocks').insert({
        blocker_id: user.id,
        blocked_id: blockedId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      toast.success('User blocked');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.info('User already blocked');
      } else {
        toast.error(error.message || 'Failed to block user');
      }
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      toast.success('User unblocked');
    },
  });
}

export function useBlockedUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      if (error) throw error;
      return data.map(b => b.blocked_id);
    },
    enabled: !!user,
  });
}
