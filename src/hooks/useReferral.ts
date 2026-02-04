import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReferralData {
  referral_code: string;
  status: string;
}

interface UserCredits {
  balance: number;
}

export function useReferralCode() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('referrals')
        .select('referral_code, status')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ReferralData | null;
    },
    enabled: !!user?.id,
  });
}

export function useUserCredits() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-credits', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserCredits | null;
    },
    enabled: !!user?.id,
  });
}

export function useReferralStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { signedUp: 0, converted: 0 };

      const { data, error } = await supabase
        .from('referrals')
        .select('status')
        .eq('referrer_id', user.id)
        .neq('referred_user_id', null);

      if (error) throw error;

      const signedUp = data?.filter(r => r.status === 'signed_up' || r.status === 'converted').length || 0;
      const converted = data?.filter(r => r.status === 'converted').length || 0;

      return { signedUp, converted };
    },
    enabled: !!user?.id,
  });
}
