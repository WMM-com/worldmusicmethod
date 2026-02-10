import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LessonRating {
  id: string;
  booking_request_id: string;
  student_id: string;
  tutor_id: string;
  lesson_id: string;
  rating: number;
  review: string | null;
  created_at: string;
}

export function useLessonRatings(lessonId?: string) {
  return useQuery({
    queryKey: ['lesson-ratings', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_ratings')
        .select('*')
        .eq('lesson_id', lessonId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LessonRating[];
    },
    enabled: !!lessonId,
  });
}

export function useTutorAverageRating(tutorId?: string) {
  return useQuery({
    queryKey: ['tutor-avg-rating', tutorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_ratings')
        .select('rating')
        .eq('tutor_id', tutorId!);
      if (error) throw error;
      if (!data?.length) return { average: 0, count: 0 };
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      return { average: Math.round(avg * 10) / 10, count: data.length };
    },
    enabled: !!tutorId,
  });
}

export function useMyRatingForBooking(bookingRequestId?: string) {
  return useQuery({
    queryKey: ['my-rating', bookingRequestId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('lesson_ratings')
        .select('*')
        .eq('booking_request_id', bookingRequestId!)
        .eq('student_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as LessonRating | null;
    },
    enabled: !!bookingRequestId,
  });
}

export function useCreateLessonRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingRequestId, tutorId, lessonId, rating, review }: {
      bookingRequestId: string;
      tutorId: string;
      lessonId: string;
      rating: number;
      review?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('lesson_ratings')
        .insert({
          booking_request_id: bookingRequestId,
          student_id: user.id,
          tutor_id: tutorId,
          lesson_id: lessonId,
          rating,
          review: review || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-ratings'] });
      queryClient.invalidateQueries({ queryKey: ['my-rating'] });
      queryClient.invalidateQueries({ queryKey: ['tutor-avg-rating'] });
    },
  });
}
