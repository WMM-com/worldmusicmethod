import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { SiteHeader } from '@/components/layout/SiteHeader';
import Profile from '@/pages/Profile';

/**
 * Route handler for legacy /profile/:userId paths.
 *
 * If :userId is a UUID, looks up the user's username:
 *   - If username exists → redirect to /:username (SEO)
 *   - If no username → render Profile inline with the UUID (backwards compatible)
 * Non-UUID params fall through to Profile as well.
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
      // User has a username — redirect to the clean branded URL
      navigate(`/${username}`, { replace: true });
    }
    // If no username found, stay on /profile/:userId — Profile component renders below
  }, [username, isLoading, isUUID, navigate]);

  // Non-UUID userId — render Profile directly
  if (!isUUID) {
    return <Profile routeUserId={userId} />;
  }

  // Still loading or about to redirect — show skeleton
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

  // UUID but no username set — render Profile with this userId (backwards compatible)
  return <Profile routeUserId={userId} />;
}
