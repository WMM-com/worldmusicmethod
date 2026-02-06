import { useParams, useNavigate } from "react-router-dom";
import { useResolveUsername } from "@/hooks/useUsernameResolution";
import Profile from "./Profile";
import NotFound from "./NotFound";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useEffect } from "react";

export default function AtProfile() {
  const { handle, slug } = useParams<{ handle: string; slug?: string }>();
  const navigate = useNavigate();

  // Handle /@username → redirect to /username (301-style)
  const isAtRoute = handle?.startsWith("@");
  const username = isAtRoute ? handle.slice(1) : handle;

  // Always call hooks unconditionally
  const { data: resolution, isLoading } = useResolveUsername(
    // Only resolve when NOT an @ redirect (@ routes just redirect, no need to resolve)
    isAtRoute ? undefined : username
  );

  // Redirect /@username → /username
  useEffect(() => {
    if (isAtRoute && handle) {
      const cleanUsername = handle.slice(1);
      const newPath = slug ? `/${cleanUsername}/${slug}` : `/${cleanUsername}`;
      navigate(newPath, { replace: true });
    }
  }, [isAtRoute, handle, slug, navigate]);

  // Handle redirect for old usernames (301-style client redirect)
  useEffect(() => {
    if (!resolution || !resolution.found || !resolution.is_redirect) return;

    const newPath = slug
      ? `/${resolution.username}/${slug}`
      : `/${resolution.username}`;
    navigate(newPath, { replace: true });
  }, [resolution, slug, navigate]);

  // For @ routes, show nothing while redirecting
  if (isAtRoute) return null;

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

  // Not found or redirect in progress
  if (!resolution?.found || resolution.is_redirect) {
    if (resolution?.is_redirect) return null;
    return <NotFound />;
  }

  // Resolved: pass the real UUID to Profile
  return <Profile routeUserId={resolution.user_id} routeSlug={slug} />;
}
