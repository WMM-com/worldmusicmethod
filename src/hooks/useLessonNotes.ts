import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LessonNote {
  id: string;
  booking_request_id: string;
  author_id: string;
  content: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export function useLessonNotes(bookingRequestId?: string) {
  return useQuery({
    queryKey: ['lesson-notes', bookingRequestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_notes')
        .select('*')
        .eq('booking_request_id', bookingRequestId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LessonNote[];
    },
    enabled: !!bookingRequestId,
  });
}

export function useCreateLessonNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingRequestId, content, isPrivate = false }: {
      bookingRequestId: string;
      content: string;
      isPrivate?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('lesson_notes')
        .insert({
          booking_request_id: bookingRequestId,
          author_id: user.id,
          content,
          is_private: isPrivate,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-notes', vars.bookingRequestId] });
    },
  });
}

export function useUpdateLessonNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content, isPrivate }: { id: string; content?: string; isPrivate?: boolean }) => {
      const updateData: Record<string, unknown> = {};
      if (content !== undefined) updateData.content = content;
      if (isPrivate !== undefined) updateData.is_private = isPrivate;
      const { error } = await supabase
        .from('lesson_notes')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-notes'] });
    },
  });
}
