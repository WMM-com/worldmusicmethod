import { useEffect, useRef, useState, useCallback } from 'react';

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'invisible';
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'invisible';
  'refresh-expired'?: 'auto' | 'manual' | 'never';
}

let turnstileScriptLoaded = false;
let turnstileScriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadTurnstileScript(): Promise<void> {
  if (turnstileScriptLoaded) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    if (turnstileScriptLoading) {
      loadCallbacks.push(resolve);
      return;
    }

    turnstileScriptLoading = true;
    
    window.onTurnstileLoad = () => {
      turnstileScriptLoaded = true;
      turnstileScriptLoading = false;
      resolve();
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
    };

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

export function Turnstile({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  size = 'normal',
  className,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleVerify = useCallback((token: string) => {
    onVerify(token);
  }, [onVerify]);

  useEffect(() => {
    loadTurnstileScript().then(() => {
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady || !containerRef.current || !window.turnstile) return;

    // Clean up any existing widget
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        // Widget may not exist
      }
    }

    // Render new widget
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: handleVerify,
      'error-callback': onError,
      'expired-callback': onExpire,
      theme,
      size,
      'refresh-expired': 'auto',
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Widget may not exist
        }
        widgetIdRef.current = null;
      }
    };
  }, [isReady, siteKey, handleVerify, onError, onExpire, theme, size]);

  return <div ref={containerRef} className={className} />;
}

export function useTurnstileVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async (token: string): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-turnstile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ token }),
        }
      );

      const result = await response.json();
      
      if (result.success) {
        setIsVerified(true);
        return true;
      } else {
        setError(result.error || 'Verification failed');
        return false;
      }
    } catch (e) {
      setError('Failed to verify');
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const reset = () => {
    setIsVerified(false);
    setError(null);
  };

  return { verify, isVerifying, isVerified, error, reset };
}