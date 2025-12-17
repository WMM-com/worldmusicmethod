import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface IncomeProofShare {
  id: string;
  user_id: string;
  share_token: string;
  include_income_summary: boolean;
  include_monthly_breakdown: boolean;
  include_tax_calculations: boolean;
  include_other_income: boolean;
  valid_until: string | null;
  created_at: string;
}

export function useIncomeProofShares() {
  const { user } = useAuth();
  const [shares, setShares] = useState<IncomeProofShare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchShares();
    }
  }, [user]);

  const fetchShares = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('income_proof_shares')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShares(data || []);
    } catch (error) {
      console.error('Error fetching shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const createShare = async (options: {
    include_income_summary: boolean;
    include_monthly_breakdown: boolean;
    include_tax_calculations: boolean;
    include_other_income: boolean;
    valid_until?: Date | null;
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('income_proof_shares')
        .insert({
          user_id: user.id,
          include_income_summary: options.include_income_summary,
          include_monthly_breakdown: options.include_monthly_breakdown,
          include_tax_calculations: options.include_tax_calculations,
          include_other_income: options.include_other_income,
          valid_until: options.valid_until?.toISOString() || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      setShares(prev => [data, ...prev]);
      toast.success('Share link created');
      return data;
    } catch (error) {
      console.error('Error creating share:', error);
      toast.error('Failed to create share link');
      return null;
    }
  };

  const deleteShare = async (id: string) => {
    try {
      const { error } = await supabase
        .from('income_proof_shares')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setShares(prev => prev.filter(s => s.id !== id));
      toast.success('Share link deleted');
    } catch (error) {
      console.error('Error deleting share:', error);
      toast.error('Failed to delete share link');
    }
  };

  return {
    shares,
    loading,
    createShare,
    deleteShare,
    refetch: fetchShares,
  };
}
