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

interface PageRedirectRow {
  id: string;
  slug: string;
  page_type: string;
  redirect_url: string | null;
  redirect_code: number | null;
  is_published: boolean;
}

function normalizePath(path: string) {
  const trimmed = (path ?? '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function normalizeTarget(target: string) {
  const trimmed = (target ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function useRedirections() {
  return useQuery({
    queryKey: ['redirections'],
    queryFn: async () => {
      // Redirect rules can be managed in two places:
      // 1) Admin "URL Redirections" (public.redirections)
      // 2) Admin "Pages & Redirects" with type=redirect (public.pages)
      const [redirectionsRes, pagesRes] = await Promise.all([
        supabase
          .from('redirections')
          .select('*')
          .eq('is_active', true),
        supabase
          .from('pages')
          .select('id,slug,page_type,redirect_url,redirect_code,is_published')
          .eq('page_type', 'redirect')
          .eq('is_published', true)
          .not('redirect_url', 'is', null),
      ]);

      if (redirectionsRes.error) throw redirectionsRes.error;
      if (pagesRes.error) throw pagesRes.error;

      const redirections = (redirectionsRes.data ?? []) as unknown as Redirection[];
      const pageRedirects = (pagesRes.data ?? []) as unknown as PageRedirectRow[];

      const mappedPageRedirects: Redirection[] = pageRedirects
        .filter((p) => p.page_type === 'redirect' && p.is_published && !!p.redirect_url)
        .map((p) => ({
          id: p.id,
          source_url: normalizePath(p.slug),
          target_url: normalizeTarget(p.redirect_url ?? ''),
          status_code: p.redirect_code ?? 301,
          is_active: true,
        }))
        .filter((r) => !!r.source_url && !!r.target_url);

      // Prefer explicit entries from public.redirections when there is a conflict
      const bySource = new Map<string, Redirection>();
      for (const r of mappedPageRedirects) bySource.set(normalizePath(r.source_url), r);
      for (const r of redirections) bySource.set(normalizePath(r.source_url), r);

      return Array.from(bySource.values());
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
