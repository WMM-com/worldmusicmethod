import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CheckResult {
  available: boolean;
  error?: string;
  message?: string;
}

export function useCheckUsername(username: string, currentUsername?: string) {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Clear previous result on input change
    setResult(null);

    // Don't check if empty, too short, or same as current
    const cleaned = username.toLowerCase().trim();
    if (!cleaned || cleaned.length < 3) {
      setChecking(false);
      if (cleaned.length > 0 && cleaned.length < 3) {
        setResult({ available: false, error: 'Username must be at least 3 characters' });
      }
      return;
    }

    if (cleaned === currentUsername) {
      setResult({ available: true, message: 'This is your current username' });
      setChecking(false);
      return;
    }

    // Client-side format validation first
    if (!/^[a-z0-9_-]+$/.test(cleaned)) {
      setResult({ available: false, error: 'Only letters, numbers, hyphens, and underscores allowed' });
      setChecking(false);
      return;
    }

    if (/^[-_]|[-_]$/.test(cleaned)) {
      setResult({ available: false, error: 'Cannot start or end with a hyphen or underscore' });
      setChecking(false);
      return;
    }

    if (/[-_]{2,}/.test(cleaned)) {
      setResult({ available: false, error: 'No consecutive hyphens or underscores' });
      setChecking(false);
      return;
    }

    // Debounce the server call
    setChecking(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-username', {
          body: { username: cleaned },
        });

        if (error) {
          setResult({ available: false, error: 'Unable to check availability' });
        } else {
          setResult(data as CheckResult);
        }
      } catch {
        setResult({ available: false, error: 'Unable to check availability' });
      } finally {
        setChecking(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, currentUsername]);

  return { result, checking };
}
