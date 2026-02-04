import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Review {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  prompt_question: string | null;
  prompt_answer: string | null;
  created_at: string;
}

interface ReviewWithProfile extends Review {
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface CreateReviewInput {
  course_id: string;
  rating: number;
  review_text?: string;
  prompt_question?: string;
  prompt_answer?: string;
}

export function useUserReview(courseId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-review', courseId, user?.id],
    queryFn: async () => {
      if (!courseId || !user?.id) return null;

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Review | null;
    },
    enabled: !!courseId && !!user?.id,
  });
}

export function useCourseReviews(courseId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: ['course-reviews', courseId, limit],
    queryFn: async () => {
      if (!courseId) return [];

      let query = supabase
        .from('reviews')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data: reviews, error } = await query;

      if (error) throw error;
      if (!reviews || reviews.length === 0) return [];

      // Fetch profiles for all reviewers
      const userIds = [...new Set(reviews.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

      return reviews.map(review => ({
        ...review,
        profiles: profileMap.get(review.user_id) ?? null,
      })) as ReviewWithProfile[];
    },
    enabled: !!courseId,
  });
}

export function useCourseReviewsCount(courseId: string | undefined) {
  return useQuery({
    queryKey: ['course-reviews-count', courseId],
    queryFn: async () => {
      if (!courseId) return 0;

      const { count, error } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!courseId,
  });
}

export function useCourseAverageRating(courseId: string | undefined) {
  return useQuery({
    queryKey: ['course-avg-rating', courseId],
    queryFn: async () => {
      if (!courseId) return null;

      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('course_id', courseId);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const sum = data.reduce((acc, r) => acc + r.rating, 0);
      return {
        average: sum / data.length,
        count: data.length,
      };
    },
    enabled: !!courseId,
  });
}

export function useUserEnrollment(courseId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-enrollment', courseId, user?.id],
    queryFn: async () => {
      if (!courseId || !user?.id) return null;

      const { data, error } = await supabase
        .from('course_enrollments')
        .select('id, is_active')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!user?.id,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateReviewInput) => {
      if (!user?.id) throw new Error('Must be logged in to submit a review');

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          course_id: input.course_id,
          user_id: user.id,
          rating: input.rating,
          review_text: input.review_text || null,
          prompt_question: input.prompt_question || null,
          prompt_answer: input.prompt_answer || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already reviewed this course');
        }
        throw error;
      }

      return data as Review;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-review', data.course_id] });
      queryClient.invalidateQueries({ queryKey: ['course-reviews', data.course_id] });
      queryClient.invalidateQueries({ queryKey: ['user-points'] });
      toast({
        title: 'Review submitted!',
        description: 'Thank you for your feedback. You may have earned bonus points!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to submit review',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateReviewInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          rating: input.rating,
          review_text: input.review_text,
          prompt_question: input.prompt_question,
          prompt_answer: input.prompt_answer,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Review;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-review', data.course_id] });
      queryClient.invalidateQueries({ queryKey: ['course-reviews', data.course_id] });
      toast({
        title: 'Review updated!',
        description: 'Your review has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update review',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
