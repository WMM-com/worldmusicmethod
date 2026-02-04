import { supabase } from '@/integrations/supabase/client';
import { getReferralCode, clearReferralCode } from '@/lib/referralCookies';

interface LinkReferralResult {
  success: boolean;
  error?: string;
  referral_id?: string;
  referrer_id?: string;
}

/**
 * Links a newly signed up user to their referrer.
 * Reads the referral code from cookie, validates it, and updates the referral record.
 * Clears the cookie after processing.
 * 
 * @param userId - The ID of the newly created user
 * @returns Result object with success status and any error message
 */
export async function linkReferralOnSignup(userId: string): Promise<LinkReferralResult> {
  const referralCode = getReferralCode();
  
  if (!referralCode) {
    // No referral code in cookie, nothing to link
    return { success: true };
  }

  console.log(`Attempting to link referral: code=${referralCode}, userId=${userId}`);

  try {
    const { data, error } = await supabase.functions.invoke('link-referral', {
      body: { 
        referral_code: referralCode, 
        user_id: userId 
      }
    });

    // Always clear the cookie after attempting to link
    clearReferralCode();

    if (error) {
      console.error('Error linking referral:', error);
      return { success: false, error: error.message };
    }

    if (!data.success) {
      console.warn('Referral linking failed:', data.error);
      // Return success: true because this shouldn't block signup
      // The referral just couldn't be linked (expired, already used, etc.)
      return { success: true, error: data.error };
    }

    console.log('Successfully linked referral:', data);
    return {
      success: true,
      referral_id: data.referral_id,
      referrer_id: data.referrer_id
    };
  } catch (err) {
    console.error('Unexpected error linking referral:', err);
    // Clear cookie even on error
    clearReferralCode();
    return { success: false, error: 'Failed to link referral' };
  }
}
