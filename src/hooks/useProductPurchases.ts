import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DigitalProductPurchase {
  id: string;
  product_id: string;
  buyer_id: string | null;
  buyer_email: string;
  seller_id: string;
  amount: number;
  currency: string;
  payment_provider: string;
  provider_payment_id: string | null;
  status: string;
  download_token: string;
  download_expires_at: string;
  download_count: number;
  max_downloads: number;
  created_at: string;
  completed_at: string | null;
  // Joined fields
  product?: {
    title: string;
    file_url: string;
  };
}

// Purchases I've made (as a buyer)
export function useMyPurchases() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-purchases', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('digital_product_purchases')
        .select(`
          *,
          product:digital_products(title, file_url)
        `)
        .eq('buyer_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DigitalProductPurchase[];
    },
    enabled: !!user,
  });
}

// Sales of my products (as a seller)
export function useMySales() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-sales', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('digital_product_purchases')
        .select(`
          *,
          product:digital_products(title)
        `)
        .eq('seller_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DigitalProductPurchase[];
    },
    enabled: !!user,
  });
}

// Sales statistics for a seller
export function useSalesStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('digital_product_purchases')
        .select('amount, currency')
        .eq('seller_id', user.id)
        .eq('status', 'completed');

      if (error) throw error;

      const totalSales = data.length;
      const totalRevenue = data.reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        totalSales,
        totalRevenue,
        currency: data[0]?.currency || 'USD',
      };
    },
    enabled: !!user,
  });
}
