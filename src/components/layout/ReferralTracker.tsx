import { useReferralTracking } from '@/hooks/useReferralTracking';

/**
 * Invisible component that handles referral tracking.
 * Place this inside BrowserRouter to capture ?ref= parameters.
 */
export function ReferralTracker() {
  // This hook handles all the referral tracking logic
  useReferralTracking();
  
  return null;
}
