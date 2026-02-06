import { useParams } from "react-router-dom";
import { useResolveUsername } from "@/hooks/useUsernameResolution";
import Profile from "./Profile";
import NotFound from "./NotFound";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Route component for /:handle and /:handle/:slug.
 *
 * Redirect duties (/@username → /username, /old-username → /current-username)
 * are handled upstream by the global useUsernameRedirect middleware in AppContent.
 *
 * By the time this component renders, the path is a clean /current-username.
 * It simply resolves the username to a user UUID and renders the Profile.
 */
export default function AtProfile() {
  const { handle, slug } = useParams<{ handle: string; slug?: string }>();

  // Strip @ as a fallback (middleware normally handles this)
  const username = handle?.startsWith("@") ? handle.slice(1) : handle;

  // Resolve username → user_id (shares cache with useUsernameRedirect)
  const { data: resolution, isLoading } = useResolveUsername(username);

  // While middleware redirect is in flight, show nothing
  if (handle?.startsWith("@")) return null;

  if (isLoading) {
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

  // Old-username redirect in progress (middleware is navigating)
  if (resolution?.is_redirect) return null;

  // Not found
  if (!resolution?.found) return <NotFound />;

  // Resolved: render the profile
  return <Profile routeUserId={resolution.user_id} routeSlug={slug} />;
}
