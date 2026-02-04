import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getReferralCode, setReferralCode, clearReferralCode, hasReferralCode } from '@/lib/referralCookies';

/**
 * Hook to track referral codes from URL and manage cookie storage.
 * Use this at the app level to capture referral codes from incoming links.
 */
export function useReferralTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [referralCode, setReferralCodeState] = useState<string | undefined>(getReferralCode);

  useEffect(() => {
    const refParam = searchParams.get('ref');
    
    if (refParam && refParam.trim()) {
      const wasSet = setReferralCode(refParam.trim());
      
      if (wasSet) {
        setReferralCodeState(refParam.trim());
        console.log(`Referral code "${refParam}" stored in cookie`);
      } else {
        console.log(`Referral code cookie already exists, not overwriting`);
      }
      
      // Clean URL by removing ref parameter
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('ref');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const clearReferral = useCallback(() => {
    clearReferralCode();
    setReferralCodeState(undefined);
  }, []);

  return {
    referralCode,
    hasReferral: hasReferralCode(),
    clearReferral,
  };
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
