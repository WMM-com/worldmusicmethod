import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PaymentAccount {
  id: string;
  user_id: string;
  provider: 'stripe' | 'flutterwave' | 'paypal';
  account_id: string | null;
  onboarding_complete: boolean;
  account_email: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function usePaymentAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payment-accounts', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as PaymentAccount[];
    },
    enabled: !!user,
  });
}

export function useConnectStripe() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { 
          returnUrl: `${origin}/settings?stripe_success=true`,
          refreshUrl: `${origin}/settings?stripe_refresh=true`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      queryClient.invalidateQueries({ queryKey: ['payment-accounts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start Stripe onboarding');
    },
  });
}

export function useConnectFlutterwave() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      business_name: string;
      business_email: string;
      bank_code: string;
      account_number: string;
      country: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('flutterwave-subaccount-create', {
        body: { user_id: user.id, ...params },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-accounts'] });
      toast.success('Flutterwave account connected');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to connect Flutterwave');
    },
  });
}

export function useConnectPaypal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('paypal-connect', {
        body: { user_id: user.id, email },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-accounts'] });
      toast.success('PayPal account connected');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to connect PayPal');
    },
  });
}

export function useDisconnectPaymentAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('payment_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-accounts'] });
      toast.success('Payment account disconnected');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to disconnect account');
    },
  });
}
