import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OtherIncome, OtherIncomeCategory } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const OTHER_INCOME_CATEGORIES: { value: OtherIncomeCategory; label: string }[] = [
  { value: 'royalties', label: 'Royalties' },
  { value: 'merch', label: 'Merch Sales' },
  { value: 'funding', label: 'Funding / Grants' },
  { value: 'benefits', label: 'State Benefits' },
  { value: 'employment', label: 'Other Employment' },
  { value: 'rental', label: 'Rental Income' },
  { value: 'teaching', label: 'Teaching (non-event)' },
  { value: 'other', label: 'Other' },
];

export function useOtherIncome() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const otherIncomeQuery = useQuery({
    queryKey: ['other_income', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('other_income')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as OtherIncome[];
    },
    enabled: !!user,
  });

  const createOtherIncome = useMutation({
    mutationFn: async (income: Omit<OtherIncome, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('other_income')
        .insert({
          ...income,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OtherIncome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['other_income'] });
      toast.success('Income added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add income: ' + error.message);
    },
  });

  const updateOtherIncome = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OtherIncome> & { id: string }) => {
      const { data, error } = await supabase
        .from('other_income')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as OtherIncome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['other_income'] });
      toast.success('Income updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update income: ' + error.message);
    },
  });

  const deleteOtherIncome = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('other_income')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['other_income'] });
      toast.success('Income deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete income: ' + error.message);
    },
  });

  return {
    otherIncome: otherIncomeQuery.data ?? [],
    isLoading: otherIncomeQuery.isLoading,
    error: otherIncomeQuery.error,
    createOtherIncome,
    updateOtherIncome,
    deleteOtherIncome,
  };
}
