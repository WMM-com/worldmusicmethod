import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { SiteHeader } from '@/components/layout/SiteHeader';

/**
 * Route handler for legacy /profile/:userId paths.
 *
 * If :userId is a UUID, looks up the user's username and redirects to /:username.
 * This ensures all old /profile/uuid links get SEO-redirected to clean URLs.
 * Falls through to <Profile /> if the user has no username set.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ProfileRedirect() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const isUUID = userId ? UUID_REGEX.test(userId) : false;

  const { data: username, isLoading } = useQuery({
    queryKey: ['profile-username', userId],
    queryFn: async () => {
      if (!userId || !isUUID) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data?.username as string | null;
    },
    enabled: isUUID,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!isUUID || isLoading) return;
    if (username) {
      navigate(`/${username}`, { replace: true });
    }
    // If no username found, stay on /profile/:userId (Profile component handles it)
  }, [username, isLoading, isUUID, navigate]);

  // Non-UUID userId (shouldn't happen, but let Profile handle it)
  if (!isUUID) {
    return null; // App.tsx will render Profile for this case
  }

  // Show loading skeleton while resolving
  if (isLoading || username) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen">
          <Skeleton className="h-48 sm:h-64 w-full" />
          <div className="max-w-5xl mx-auto px-4 -mt-16 sm:-mt-20 relative z-10">
            <div className="flex gap-4 items-end">
              <Skeleton className="h-32 w-32 sm:h-40 sm:w-40 rounded-full" />
              <div className="flex-1 pb-4 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // UUID but no username → render Profile inline (lazy import to avoid circular dep)
  return null;
}
