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

      // Find or create a referral entry for this user
      // First check if user already has a referral code
      const { data: existingReferral, error: fetchError } = await supabase
        .from('referrals')
        .select('referral_code, status')
        .eq('referrer_id', user.id)
        .is('referred_user_id', null) // Get the unused one (template for sharing)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (existingReferral) {
        return existingReferral as ReferralData;
      }

      // If no referral code exists, create one
      const newCode = generateReferralCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 365); // 1 year expiry for the template

      const { data: newReferral, error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: user.id,
          referral_code: newCode,
          status: 'clicked', // Template status
          clicked_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .select('referral_code, status')
        .single();

      if (insertError) throw insertError;
      return newReferral as ReferralData;
    },
    enabled: !!user?.id,
  });
}

// Generate a random 8-character alphanumeric code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0, O, 1, I
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
