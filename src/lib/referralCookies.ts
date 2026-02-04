import Cookies from 'js-cookie';

const REFERRAL_COOKIE_NAME = 'referral_code';
const COOKIE_EXPIRY_DAYS = 10;

/**
 * Get the referral code from cookie
 */
export function getReferralCode(): string | undefined {
  return Cookies.get(REFERRAL_COOKIE_NAME);
}

/**
 * Set referral code cookie (only if not already set)
 * @returns true if cookie was set, false if it already existed
 */
export function setReferralCode(code: string): boolean {
  const existing = Cookies.get(REFERRAL_COOKIE_NAME);
  if (existing) {
    return false; // Don't overwrite existing cookie
  }
  
  Cookies.set(REFERRAL_COOKIE_NAME, code, {
    expires: COOKIE_EXPIRY_DAYS,
    sameSite: 'lax',
    secure: window.location.protocol === 'https:',
  });
  return true;
}

/**
 * Clear the referral cookie (call after successful signup)
 */
export function clearReferralCode(): void {
  Cookies.remove(REFERRAL_COOKIE_NAME);
}

/**
 * Check if a referral cookie exists
 */
export function hasReferralCode(): boolean {
  return !!Cookies.get(REFERRAL_COOKIE_NAME);
}
