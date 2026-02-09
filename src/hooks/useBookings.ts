import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BookingRequest {
  id: string;
  student_id: string;
  lesson_id: string;
  status: string;
  created_at: string;
  // Joined
  student?: { id: string; full_name: string | null; avatar_url: string | null; email: string | null };
  lesson?: { id: string; title: string; price: number | null; currency: string; duration_minutes: number };
  slots?: BookingSlot[];
}

export interface BookingSlot {
  id: string;
  request_id: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}

export function useMyBookingRequests() {
  return useQuery({
    queryKey: ['my-booking-requests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('booking_requests')
        .select('*, lesson:lessons(*), slots:booking_slots(*)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BookingRequest[];
    },
  });
}

export function useTutorBookingRequests() {
  return useQuery({
    queryKey: ['tutor-booking-requests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      // Get lessons owned by tutor, then get their booking requests
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('tutor_id', user.id);
      if (!lessons?.length) return [];
      const lessonIds = lessons.map(l => l.id);
      const { data, error } = await supabase
        .from('booking_requests')
        .select('*, student:profiles!booking_requests_student_id_fkey(id, full_name, avatar_url, email), lesson:lessons(*), slots:booking_slots(*)')
        .in('lesson_id', lessonIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BookingRequest[];
    },
  });
}

export function useCreateBookingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, slots }: { lessonId: string; slots: { start: Date; end: Date }[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      // Create the booking request
      const { data: request, error: reqError } = await supabase
        .from('booking_requests')
        .insert({ student_id: user.id, lesson_id: lessonId })
        .select()
        .single();
      if (reqError) throw reqError;
      // Create the proposed slots (stored in UTC)
      const slotsData = slots.map(s => ({
        request_id: request.id,
        start_time: s.start.toISOString(),
        end_time: s.end.toISOString(),
      }));
      const { error: slotsError } = await supabase
        .from('booking_slots')
        .insert(slotsData);
      if (slotsError) throw slotsError;
      return request as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-booking-requests'] });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const { error } = await supabase
        .from('booking_requests')
        .update({ status })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-booking-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-booking-requests'] });
    },
  });
}

export function useUpdateSlotStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slotId, status }: { slotId: string; status: string }) => {
      const { error } = await supabase
        .from('booking_slots')
        .update({ status })
        .eq('id', slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-booking-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-booking-requests'] });
    },
  });
}
