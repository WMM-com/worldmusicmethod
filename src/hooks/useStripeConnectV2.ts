/**
 * useStripeConnectV2
 * 
 * React hooks for the Stripe Connect V2 integration.
 * Provides hooks for:
 * - Creating a connected account
 * - Starting onboarding
 * - Checking account status
 * - Creating products on the connected account
 * - Listing products
 * - Starting a checkout session (direct charge)
 * - Starting a subscription checkout
 * - Opening the billing portal
 * - Fetching public storefront products
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────

interface ConnectAccountStatus {
  hasAccount: boolean;
  accountId?: string;
  readyToProcessPayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string;
  displayName?: string;
}

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  default_price: {
    id: string;
    unit_amount: number;
    currency: string;
  } | null;
}

// ─── Account Creation ─────────────────────────────────────────────────

/**
 * Creates a new V2 connected account for the authenticated user.
 * This is the first step — after creation, the user must complete onboarding.
 */
export function useCreateConnectAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { display_name?: string; contact_email?: string }) => {
      const { data, error } = await supabase.functions.invoke('stripe-connect-v2-create', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connect-account-status'] });
      queryClient.invalidateQueries({ queryKey: ['payment-accounts'] });
      toast.success('Stripe account created! Complete onboarding to start accepting payments.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create Stripe account');
    },
  });
}

// ─── Onboarding ───────────────────────────────────────────────────────

/**
 * Starts the Stripe onboarding flow by creating an account link.
 * Opens the Stripe-hosted onboarding page in a new tab.
 */
export function useStartOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke('stripe-connect-v2-onboard', {
        body: {
          returnUrl: `${origin}/account?stripe_success=true`,
          refreshUrl: `${origin}/account?stripe_refresh=true`,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      queryClient.invalidateQueries({ queryKey: ['connect-account-status'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start onboarding');
    },
  });
}

// ─── Account Status ───────────────────────────────────────────────────

/**
 * Fetches the current status of the user's connected account.
 * Always queries the Stripe API directly for real-time accuracy.
 */
export function useConnectAccountStatus() {
  const { user } = useAuth();

  return useQuery<ConnectAccountStatus>({
    queryKey: ['connect-account-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stripe-connect-v2-status');
      if (error) throw error;
      return data as ConnectAccountStatus;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// ─── Products ─────────────────────────────────────────────────────────

/**
 * Lists products on the authenticated user's connected account.
 */
export function useConnectProducts() {
  const { user } = useAuth();

  return useQuery<StripeProduct[]>({
    queryKey: ['connect-products', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stripe-connect-v2-products', {
        method: 'GET',
      });
      if (error) throw error;
      return data?.products || [];
    },
    enabled: !!user,
  });
}

/**
 * Creates a new product on the user's connected account.
 */
export function useCreateConnectProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      priceInCents: number;
      currency?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('stripe-connect-v2-products', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connect-products'] });
      toast.success('Product created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
    },
  });
}

// ─── Checkout (Direct Charge) ─────────────────────────────────────────

/**
 * Creates a checkout session for a direct charge on a connected account.
 * Used by the public storefront.
 */
export function useConnectCheckout() {
  return useMutation({
    mutationFn: async (params: {
      accountId: string;
      priceId?: string;
      productName?: string;
      unitAmount?: number;
      currency?: string;
      quantity?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('stripe-connect-v2-checkout', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start checkout');
    },
  });
}

// ─── Subscription ─────────────────────────────────────────────────────

/**
 * Creates a subscription checkout session for the connected account.
 * The connected account is charged a platform subscription fee.
 */
export function useConnectSubscription() {
  return useMutation({
    mutationFn: async (priceId?: string) => {
      const { data, error } = await supabase.functions.invoke('stripe-connect-v2-subscription', {
        body: { priceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start subscription');
    },
  });
}

// ─── Billing Portal ───────────────────────────────────────────────────

/**
 * Opens the Stripe Billing Portal for managing the connected account's subscription.
 */
export function useConnectBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('stripe-connect-v2-portal');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to open billing portal');
    },
  });
}

// ─── Public Storefront ────────────────────────────────────────────────

/**
 * Fetches products for a public storefront page.
 * No authentication required — uses the connected account ID.
 * 
 * NOTE: In production, replace accountId in the URL with a username or slug
 * and resolve it server-side for better security.
 */
export function useStorefrontProducts(accountId: string | undefined) {
  return useQuery<{ products: StripeProduct[]; storeName: string }>({
    queryKey: ['storefront-products', accountId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stripe-connect-v2-storefront', {
        body: {},
        headers: {},
      });
      // Use fetch directly since we need query params and no auth
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-v2-storefront?accountId=${accountId}`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to load storefront');
      }
      return response.json();
    },
    enabled: !!accountId,
  });
}
