import { useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useProfilePages } from '@/hooks/useProfilePages';
import { useExtendedProfile } from '@/hooks/useProfilePortfolio';
import { cn } from '@/lib/utils';
import { Home } from 'lucide-react';

interface ProfileNavProps {
  userId: string;
  brandColor?: string;
  isOwnProfile?: boolean;
}

export function ProfileNav({ userId, brandColor, isOwnProfile }: ProfileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug: currentSlug } = useParams<{ slug?: string }>();
  const { data: profile } = useExtendedProfile(userId);
  const { data: pages = [] } = useProfilePages(userId);

  // Check if we're on /profile route (own profile management)
  const isOnProfileRoute = location.pathname === '/profile';

  // Filter to only visible pages (unless editing own profile)
  const visiblePages = useMemo(() => {
    const sorted = [...pages].sort((a, b) => a.order_index - b.order_index);
    if (isOwnProfile) return sorted; // Show all pages when editing
    return sorted.filter(p => p.is_visible);
  }, [pages, isOwnProfile]);

  // Determine active page
  const activePage = useMemo(() => {
    // On /profile route, default to home page
    if (isOnProfileRoute) {
      if (!currentSlug || currentSlug === 'home') {
        return visiblePages.find(p => p.is_home);
      }
      return visiblePages.find(p => p.slug === currentSlug);
    }
    // On /@username routes
    if (!currentSlug || currentSlug === 'home') {
      return visiblePages.find(p => p.is_home);
    }
    return visiblePages.find(p => p.slug === currentSlug);
  }, [currentSlug, visiblePages, isOnProfileRoute]);

  const handleTabClick = (page: any) => {
    // When on /profile, navigate to /@username to preview
    const username = profile?.username || userId;
    if (page.is_home) {
      navigate(`/@${username}`);
    } else {
      navigate(`/@${username}/${page.slug}`);
    }
  };

  if (!visiblePages.length) return null;

  return (
    <nav 
      className="border-b border-border bg-background sticky top-0 z-40"
      style={{
        '--brand-color': brandColor || 'hsl(var(--primary))',
      } as React.CSSProperties}
    >
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex min-w-min px-4 py-0">
          {visiblePages.map((page, index) => {
            const isActive = activePage?.id === page.id;
            return (
              <div key={page.id} className="flex items-center">
                <button
                  onClick={() => handleTabClick(page)}
                  className={cn(
                    'px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap relative',
                    'transition-colors duration-200',
                    'border-b-2 flex items-center gap-1.5',
                    isActive 
                      ? 'text-foreground border-b-current' 
                      : 'text-muted-foreground hover:text-foreground border-b-transparent hover:border-b-muted',
                    !page.is_visible && 'opacity-50'
                  )}
                  style={
                    isActive 
                      ? { 
                          color: 'var(--brand-color)',
                          borderBottomColor: 'var(--brand-color)',
                        }
                      : {}
                  }
                >
                  {page.is_home && <Home className="h-3 w-3" />}
                  {page.title}
                </button>
                {index < visiblePages.length - 1 && (
                  <div className="h-4 w-px bg-border opacity-50 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
