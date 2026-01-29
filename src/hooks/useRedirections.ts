import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Redirection {
  id: string;
  source_url: string;
  target_url: string;
  status_code: number;
  is_active: boolean;
}

export function useRedirections() {
  return useQuery({
    queryKey: ['redirections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('redirections')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as Redirection[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useRedirectHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: redirections, isLoading } = useRedirections();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (isLoading || !redirections) return;

    const currentPath = location.pathname;
    
    // Find matching redirect
    const match = redirections.find(r => {
      // Exact match
      if (r.source_url === currentPath) return true;
      // Match with trailing slash variations
      if (r.source_url === currentPath + '/') return true;
      if (r.source_url + '/' === currentPath) return true;
      return false;
    });

    if (match) {
      // Check if target is external URL
      if (match.target_url.startsWith('http://') || match.target_url.startsWith('https://')) {
        window.location.href = match.target_url;
      } else {
        // Internal redirect
        navigate(match.target_url, { replace: true });
      }
    }

    setHasChecked(true);
  }, [location.pathname, redirections, isLoading, navigate]);

  return { isLoading: isLoading || !hasChecked };
}
