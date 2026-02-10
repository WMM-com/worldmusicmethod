import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecurringConfig {
  frequency: 'weekly' | 'biweekly';
  total_sessions: number;
  series_price: number | null;
}

export interface Lesson {
  id: string;
  tutor_id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  duration_minutes: number;
  image_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  // New fields
  lesson_type: string;
  max_students: number;
  buffer_minutes: number;
  cancellation_policy_hours: number;
  allow_rescheduling: boolean;
  recurring_config: RecurringConfig | null;
  // Joined tutor profile
  tutor?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

export interface CreateLessonData {
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  duration_minutes?: number;
  image_url?: string;
  lesson_type?: string;
  max_students?: number;
  buffer_minutes?: number;
  cancellation_policy_hours?: number;
  allow_rescheduling?: boolean;
  recurring_config?: RecurringConfig | null;
}

export function useLessons() {
  return useQuery({
    queryKey: ['lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*, tutor:profiles!lessons_tutor_id_fkey(id, full_name, avatar_url, username)')
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Lesson[];
    },
  });
}

export function useLesson(id?: string) {
  return useQuery({
    queryKey: ['lesson', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*, tutor:profiles!lessons_tutor_id_fkey(id, full_name, avatar_url, username)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as Lesson;
    },
    enabled: !!id,
  });
}

export function useMyLessons() {
  return useQuery({
    queryKey: ['my-lessons'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('tutor_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Lesson[];
    },
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateLessonData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const insertData = { ...data, tutor_id: user.id } as Record<string, unknown>;
      const { data: result, error } = await supabase
        .from('lessons')
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

export function useUpdateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Lesson> & { id: string }) => {
      const { error } = await supabase
        .from('lessons')
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['lesson'] });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}
