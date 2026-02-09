import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DigitalProduct {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  file_url: string;
  price_type: 'fixed' | 'pwyw';
  base_price: number;
  min_price: number | null;
  geo_pricing: Record<string, any>;
  currency: string;
  is_active: boolean;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDigitalProductData {
  title: string;
  description?: string;
  file_url: string;
  price_type: 'fixed' | 'pwyw';
  base_price: number;
  min_price?: number;
  geo_pricing?: Record<string, any>;
  currency?: string;
}

export function useDigitalProducts(sellerId?: string) {
  return useQuery({
    queryKey: ['digital-products', sellerId],
    queryFn: async () => {
      let query = supabase
        .from('digital_products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DigitalProduct[];
    },
    enabled: true,
  });
}

export function useMyDigitalProducts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-digital-products', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('digital_products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DigitalProduct[];
    },
    enabled: !!user,
  });
}

export function useCreateDigitalProduct() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: CreateDigitalProductData) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data: product, error } = await supabase
        .from('digital_products')
        .insert({
          seller_id: user.id,
          ...data,
        })
        .select()
        .single();
      
      if (error) throw error;
      return product as DigitalProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-products'] });
      queryClient.invalidateQueries({ queryKey: ['my-digital-products'] });
    },
  });
}

export function useUpdateDigitalProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DigitalProduct> & { id: string }) => {
      const { data: product, error } = await supabase
        .from('digital_products')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return product as DigitalProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-products'] });
      queryClient.invalidateQueries({ queryKey: ['my-digital-products'] });
    },
  });
}

export function useDeleteDigitalProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('digital_products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-products'] });
      queryClient.invalidateQueries({ queryKey: ['my-digital-products'] });
    },
  });
}
