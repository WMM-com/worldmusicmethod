import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useResolveUsername } from '@/hooks/useUsernameResolution';

/**
 * Known route prefixes — these will NEVER be treated as usernames.
 * Keeps the middleware from making unnecessary DB calls on app routes.
 */
const KNOWN_PREFIXES = new Set([
  'auth', 'admin', 'courses', 'cart', 'checkout', 'account',
  'events', 'invoices', 'finances', 'expenses', 'documents',
  'tech-spec', 'tech-specs', 'listen', 'membership', 'messages',
  'notifications', 'community', 'social', 'profile', 'left-brain',
  'left-brain-settings', 'meet', 'tutor', 'download', 'sitemap',
  'shared', 'my-courses', 'payment-success', 'payment-cancelled',
  'reset-password', 'verify-email', 'unsubscribe', 'artist-dashboard',
  'api', '_next',
]);

/** Skip paths with static-file extensions */
const STATIC_EXT = /\.(js|css|png|jpe?g|gif|svg|ico|woff2?|ttf|eot|map|json|xml|txt|webp|avif|mp[34]|webm|pdf)$/i;

/**
 * Extracts a potential username from the current pathname.
 * Returns null if the path is a known route, static file, or invalid format.
 */
function extractPotentialUsername(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  // Only match /:handle or /:handle/:slug (1–2 segments)
  if (segments.length === 0 || segments.length > 2) return null;

  let handle = segments[0];

  // Skip static files
  if (STATIC_EXT.test(handle)) return null;

  // Skip known app routes
  if (KNOWN_PREFIXES.has(handle.toLowerCase())) return null;

  // Strip @ prefix
  if (handle.startsWith('@')) handle = handle.slice(1);

  // Basic username format: 3-30 chars, alphanumeric + hyphens/underscores
  if (!/^[a-z0-9_-]{3,30}$/i.test(handle)) return null;

  return handle.toLowerCase();
}

/**
 * Global middleware hook for username-based redirects.
 *
 * Runs in AppContent BEFORE any route component mounts.
 * Handles two cases:
 *   1. /@username → /username  (strip @ prefix, no DB call)
 *   2. /old-username → /current-username  (via resolve_username RPC, cached)
 *
 * Uses the same React Query cache key as AtProfile's useResolveUsername,
 * so results are shared and no duplicate requests are made.
 */
export function useUsernameRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  const segments = location.pathname.split('/').filter(Boolean);
  const firstSegment = segments[0] ?? '';
  const isAtRoute = firstSegment.startsWith('@');

  // 1. Handle /@username → /username immediately (no DB call needed)
  useEffect(() => {
    if (!isAtRoute || !firstSegment) return;

    const clean = firstSegment.slice(1);
    if (!clean) return;

    const rest = segments.slice(1).join('/');
    const newPath = rest ? `/${clean}/${rest}` : `/${clean}`;
    navigate(newPath, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // 2. Resolve potential old usernames via the same RPC hook AtProfile uses.
  //    The query is skipped for @ routes (handled above) and known app routes.
  const potentialUsername = isAtRoute ? undefined : extractPotentialUsername(location.pathname);

  const { data: resolution } = useResolveUsername(potentialUsername ?? undefined);

  useEffect(() => {
    if (!resolution?.found || !resolution.is_redirect || !resolution.username) return;

    const rest = segments.slice(1).join('/');
    const newPath = rest
      ? `/${resolution.username}/${rest}`
      : `/${resolution.username}`;
    navigate(newPath, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolution]);

  return {
    isRedirecting: isAtRoute || (resolution?.found && resolution.is_redirect),
  };
}
