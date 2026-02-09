import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────

export interface MerchProduct {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string | null;
  image_urls: string[];
  sku: string | null;
  base_price: number;
  currency: string;
  cost_price: number | null;
  track_inventory: boolean;
  stock_quantity: number;
  weight_grams: number | null;
  year: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MerchProductVariant {
  id: string;
  product_id: string;
  variant_label: string;
  variant_value: string;
  sku_suffix: string | null;
  price_override: number | null;
  stock_quantity: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface MerchGig {
  id: string;
  user_id: string;
  name: string;
  venue: string | null;
  location: string | null;
  gig_date: string;
  currency: string;
  notes: string | null;
  status: string;
  stripe_location_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MerchSale {
  id: string;
  user_id: string;
  gig_id: string | null;
  product_id: string | null;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  currency: string;
  payment_method: string;
  payment_source: string;
  buyer_name: string | null;
  buyer_email: string | null;
  notes: string | null;
  stripe_payment_id: string | null;
  created_at: string;
  product?: { title: string; image_url: string | null } | null;
}

// ── Products ───────────────────────────────────────────

export function useMerchProducts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['merch-products', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('merch_products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MerchProduct[];
    },
    enabled: !!user,
  });
}

export function useCreateMerchProduct() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: Omit<MerchProduct, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data: product, error } = await supabase
        .from('merch_products')
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return product;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merch-products'] });
      toast.success('Product created');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create product'),
  });
}

export function useUpdateMerchProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<MerchProduct> & { id: string }) => {
      const { error } = await supabase.from('merch_products').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merch-products'] });
      toast.success('Product updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update product'),
  });
}

export function useDeleteMerchProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('merch_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merch-products'] });
      toast.success('Product deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete product'),
  });
}

// ── Gigs ───────────────────────────────────────────────

export function useMerchGigs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['merch-gigs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('merch_gigs')
        .select('*')
        .eq('user_id', user.id)
        .order('gig_date', { ascending: false });
      if (error) throw error;
      return data as MerchGig[];
    },
    enabled: !!user,
  });
}

export function useCreateMerchGig() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: { name: string; venue?: string; location?: string; gig_date: string; currency: string; notes?: string; status?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: gig, error } = await supabase
        .from('merch_gigs')
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return gig;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merch-gigs'] });
      toast.success('Gig created');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create gig'),
  });
}

export function useUpdateMerchGig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<MerchGig> & { id: string }) => {
      const { error } = await supabase.from('merch_gigs').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merch-gigs'] });
      toast.success('Gig updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update gig'),
  });
}

export function useDeleteMerchGig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('merch_gigs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merch-gigs'] });
      toast.success('Gig deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete gig'),
  });
}

// ── Sales ──────────────────────────────────────────────

export function useMerchSales(gigId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['merch-sales', user?.id, gigId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from('merch_sales')
        .select('*, product:merch_products(title, image_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (gigId) query = query.eq('gig_id', gigId);
      const { data, error } = await query;
      if (error) throw error;
      return data as MerchSale[];
    },
    enabled: !!user,
  });
}
