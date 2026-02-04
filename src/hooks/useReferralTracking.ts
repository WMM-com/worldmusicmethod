import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getReferralCode, setReferralCode, clearReferralCode, hasReferralCode } from '@/lib/referralCookies';

/**
 * Hook to track referral codes from URL and manage cookie storage.
 * When a valid referral code is detected:
 * 1. Validates the code with the backend
 * 2. Stores it in a cookie
 * 3. Redirects to signup page
 */
export function useReferralTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [referralCode, setReferralCodeState] = useState<string | undefined>(getReferralCode);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const refParam = searchParams.get('ref');
    
    if (refParam && refParam.trim() && !isValidating) {
      const code = refParam.trim();
      setIsValidating(true);
      
      // Validate the referral code with the backend
      validateAndTrackReferral(code).then(result => {
        if (result.success) {
          // Store in cookie (won't overwrite if one exists)
          const wasSet = setReferralCode(code);
          
          if (wasSet) {
            setReferralCodeState(code);
            console.log(`Referral code "${code}" validated and stored in cookie`);
          } else {
            console.log(`Referral code cookie already exists, not overwriting`);
          }
          
          // Clean URL by removing ref parameter
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('ref');
          
          // Redirect to signup page if user is not on auth page
          if (!location.pathname.startsWith('/auth')) {
            // Navigate to signup with the cleaned params
            const queryString = newParams.toString();
            navigate(`/auth?mode=signup${queryString ? '&' + queryString : ''}`, { replace: true });
          } else {
            // Already on auth page, just clean the URL
            setSearchParams(newParams, { replace: true });
          }
        } else {
          console.warn('Invalid referral code:', code, result.error);
          // Still clean the URL even if invalid
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('ref');
          setSearchParams(newParams, { replace: true });
        }
        setIsValidating(false);
      });
    }
  }, [searchParams, setSearchParams, navigate, location.pathname, isValidating]);

  const clearReferral = useCallback(() => {
    clearReferralCode();
    setReferralCodeState(undefined);
  }, []);

  return {
    referralCode,
    hasReferral: hasReferralCode(),
    clearReferral,
    isValidating,
  };
}

/**
 * Validates the referral code with the backend
 */
async function validateAndTrackReferral(code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('track-referral-click', {
      body: { referral_code: code }
    });

    if (error) {
      console.error('Error validating referral:', error);
      return { success: false, error: error.message };
    }

    return { success: data?.success ?? false, error: data?.error };
  } catch (err) {
    console.error('Unexpected error validating referral:', err);
    return { success: false, error: 'Failed to validate referral' };
  }
}

/**
 * Simple hook to just read the current referral code from cookie.
 * Use this in components that need to check/display the referral code.
 */
export function useReferralCookie() {
  const [referralCode, setReferralCodeState] = useState<string | undefined>(getReferralCode);

  // Re-read on mount in case it changed
  useEffect(() => {
    setReferralCodeState(getReferralCode());
  }, []);

  const clear = useCallback(() => {
    clearReferralCode();
    setReferralCodeState(undefined);
  }, []);

  return {
    referralCode,
    hasReferral: !!referralCode,
    clearReferral: clear,
  };
}
