import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Safety net: if the PASSWORD_RECOVERY auth event fires and the user
 * is not already on /reset-password, redirect them there immediately.
 * This prevents the "flash" of home/dashboard before the reset page loads.
 */
export function usePasswordRecoveryRedirect() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        const hasRecoveryToken = window.location.hash.includes('type=recovery') ||
          window.location.search.includes('type=recovery');
        if (hasRecoveryToken && window.location.pathname !== '/reset-password') {
          window.location.href = '/reset-password';
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);
}
