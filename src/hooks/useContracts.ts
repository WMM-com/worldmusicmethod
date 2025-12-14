import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contract, ContractClause } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useContracts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const contractsQuery = useQuery({
    queryKey: ['contracts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any[]).map(contract => ({
        ...contract,
        clauses: contract.clauses as ContractClause[],
      })) as Contract[];
    },
    enabled: !!user,
  });

  const createContract = useMutation({
    mutationFn: async (contract: Omit<Contract, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'share_token'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('contracts')
        .insert({
          ...contract,
          user_id: user.id,
          clauses: contract.clauses as any,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        clauses: data.clauses as unknown as ContractClause[],
      } as Contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create contract: ' + error.message);
    },
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contract> & { id: string }) => {
      const updateData: any = { ...updates };
      if (updates.clauses) {
        updateData.clauses = updates.clauses as any;
      }

      const { data, error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        clauses: data.clauses as unknown as ContractClause[],
      } as Contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update contract: ' + error.message);
    },
  });

  const deleteContract = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete contract: ' + error.message);
    },
  });

  return {
    contracts: contractsQuery.data ?? [],
    isLoading: contractsQuery.isLoading,
    error: contractsQuery.error,
    createContract,
    updateContract,
    deleteContract,
  };
}

export const defaultContractClauses: ContractClause[] = [
  {
    id: '1',
    title: 'Cancellation Policy',
    content: 'If the Client cancels the event within 14 days of the scheduled date, a cancellation fee of 50% of the agreed fee will be charged. Cancellations within 7 days will incur a 100% fee.',
    enabled: true,
  },
  {
    id: '2',
    title: 'Payment Terms',
    content: 'Payment is due within 14 days of the event date. A deposit of 25% may be required to secure the booking.',
    enabled: true,
  },
  {
    id: '3',
    title: 'Performance Duration',
    content: 'The performance will last for the agreed duration as specified in this contract. Any extension must be agreed upon and may incur additional charges.',
    enabled: true,
  },
  {
    id: '4',
    title: 'Accommodation',
    content: 'The Client agrees to provide suitable accommodation for the Artist if the event requires an overnight stay.',
    enabled: false,
  },
  {
    id: '5',
    title: 'Meals & Refreshments',
    content: 'The Client agrees to provide appropriate meals and refreshments for the Artist during the event.',
    enabled: false,
  },
  {
    id: '6',
    title: 'Equipment & Technical Requirements',
    content: 'The Client is responsible for providing the technical requirements as specified in the attached rider. The Artist will provide their own instruments unless otherwise agreed.',
    enabled: true,
  },
  {
    id: '7',
    title: 'Force Majeure',
    content: 'Neither party shall be liable for failure to perform due to circumstances beyond their reasonable control, including but not limited to acts of God, war, pandemic, or government restrictions.',
    enabled: true,
  },
];
