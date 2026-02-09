import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TutorAvailability {
  id: string;
  tutor_id: string;
  lesson_id: string | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  timezone: string;
  is_recurring: boolean;
  specific_date: string | null;
  active: boolean;
  created_at: string;
}

export interface CreateAvailabilityData {
  lesson_id?: string | null;
  day_of_week?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  timezone: string;
  is_recurring: boolean;
  specific_date?: string | null;
}

export function useTutorAvailability(tutorId?: string) {
  return useQuery({
    queryKey: ['tutor-availability', tutorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutor_availability')
        .select('*')
        .eq('tutor_id', tutorId!)
        .eq('active', true)
        .order('day_of_week', { ascending: true });
      if (error) throw error;
      return data as TutorAvailability[];
    },
    enabled: !!tutorId,
  });
}

export function useMyAvailability() {
  return useQuery({
    queryKey: ['my-tutor-availability'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('tutor_availability')
        .select('*')
        .eq('tutor_id', user.id)
        .eq('active', true)
        .order('day_of_week', { ascending: true });
      if (error) throw error;
      return data as TutorAvailability[];
    },
  });
}

export function useCreateAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAvailabilityData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: result, error } = await supabase
        .from('tutor_availability')
        .insert({ ...data, tutor_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tutor-availability'] });
      queryClient.invalidateQueries({ queryKey: ['tutor-availability'] });
    },
  });
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tutor_availability')
        .update({ active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tutor-availability'] });
      queryClient.invalidateQueries({ queryKey: ['tutor-availability'] });
    },
  });
}

/** Convert recurring availability slots into concrete date/time ranges within a date range */
export function expandAvailabilityToSlots(
  availability: TutorAvailability[],
  rangeStart: Date,
  rangeEnd: Date,
  studentTimezone: string
): { start: Date; end: Date; availabilityId: string; isRecurring: boolean }[] {
  const slots: { start: Date; end: Date; availabilityId: string; isRecurring: boolean }[] = [];

  for (const avail of availability) {
    if (avail.is_recurring && avail.day_of_week != null && avail.start_time && avail.end_time) {
      // Expand recurring slots across the date range
      const current = new Date(rangeStart);
      while (current <= rangeEnd) {
        if (current.getDay() === avail.day_of_week) {
          const [sh, sm] = avail.start_time.split(':').map(Number);
          const [eh, em] = avail.end_time.split(':').map(Number);
          const start = new Date(current);
          start.setHours(sh, sm, 0, 0);
          const end = new Date(current);
          end.setHours(eh, em, 0, 0);
          // Only include future slots
          if (start > new Date()) {
            slots.push({ start, end, availabilityId: avail.id, isRecurring: true });
          }
        }
        current.setDate(current.getDate() + 1);
      }
    } else if (!avail.is_recurring && avail.specific_date && avail.start_time && avail.end_time) {
      // One-off slot
      const date = new Date(avail.specific_date);
      if (date >= rangeStart && date <= rangeEnd) {
        const [sh, sm] = avail.start_time.split(':').map(Number);
        const [eh, em] = avail.end_time.split(':').map(Number);
        const start = new Date(date);
        start.setHours(sh, sm, 0, 0);
        const end = new Date(date);
        end.setHours(eh, em, 0, 0);
        if (start > new Date()) {
          slots.push({ start, end, availabilityId: avail.id, isRecurring: false });
        }
      }
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}
