import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TemplateSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
}

export interface AvailabilityTemplate {
  id: string;
  tutor_id: string;
  name: string;
  slots: TemplateSlot[];
  created_at: string;
  updated_at: string;
}

export function useAvailabilityTemplates() {
  return useQuery({
    queryKey: ['availability-templates'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('availability_templates')
        .select('*')
        .eq('tutor_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        slots: (t.slots as unknown as TemplateSlot[]) || [],
      })) as AvailabilityTemplate[];
    },
  });
}

export function useCreateAvailabilityTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, slots }: { name: string; slots: TemplateSlot[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('availability_templates')
        .insert({ tutor_id: user.id, name, slots: slots as any })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-templates'] });
    },
  });
}

export function useDeleteAvailabilityTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('availability_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-templates'] });
    },
  });
}
