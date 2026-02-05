import { useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useProfilePages } from '@/hooks/useProfilePages';
import { useExtendedProfile } from '@/hooks/useProfilePortfolio';
import { cn } from '@/lib/utils';
import { Home, User, FileText, Image } from 'lucide-react';

interface ProfileNavProps {
  userId: string;
  brandColor?: string;
  isOwnProfile?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onPageNavigate?: () => void;
}

// Built-in profile tabs
const BUILT_IN_TABS = [
  { id: 'about', label: 'About', icon: User },
  { id: 'posts', label: 'Posts', icon: FileText },
  { id: 'media', label: 'Media', icon: Image },
];

export function ProfileNav({
  userId,
  brandColor,
  isOwnProfile,
  activeTab = 'about',
  onTabChange,
  onPageNavigate,
}: ProfileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug: currentSlug } = useParams<{ slug?: string }>();
  const { data: profile } = useExtendedProfile(userId);
  const { data: pages = [] } = useProfilePages(userId);

  // Check if we're on /profile route (own profile management)
  const isOnProfileRoute = location.pathname === '/profile' || location.pathname.startsWith('/profile/pages');

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

  const handlePageClick = (page: any) => {
    // On /profile (own profile management), keep navigation inside /profile
    if (isOnProfileRoute) {
      onPageNavigate?.();
      
      // Update URL based on whether it's home or custom page
      if (page.is_home) {
        navigate('/profile', { replace: false });
        // Switch to "page" tab to show home page content
        onTabChange?.('page');
      } else {
        navigate(`/profile/pages/${page.slug}`, { replace: false });
        // Switch to "page" tab to show custom page content
        onTabChange?.('page');
      }
      return;
    }

    // Public profile navigation at /@username
    const username = profile?.username || userId;
    if (page.is_home) {
      navigate(`/@${username}`);
    } else {
      navigate(`/@${username}/${page.slug}`);
    }
  };

  const handleBuiltInTabClick = (tabId: string) => {
    onTabChange?.(tabId);
  };

  // Determine if a custom page is active (for highlighting logic)
  const isCustomPageActive = activeTab === 'page';

  return (
    <nav 
      className="border-b border-border bg-muted/50 rounded-lg"
      style={{
        '--brand-color': brandColor || 'hsl(var(--primary))',
      } as React.CSSProperties}
    >
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex min-w-min px-2 py-1">
          {/* Custom pages from database */}
          {visiblePages.map((page, index) => {
            const isActive = isCustomPageActive && activePage?.id === page.id;
            return (
              <div key={page.id} className="flex items-center">
                <button
                  onClick={() => handlePageClick(page)}
                  className={cn(
                    'px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap relative',
                    'transition-colors duration-200 rounded-md',
                    'flex items-center gap-1.5',
                    isActive 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                    !page.is_visible && 'opacity-50'
                  )}
                >
                  {page.is_home && <Home className="h-3.5 w-3.5" />}
                  {page.title}
                </button>
                {index < visiblePages.length - 1 && (
                  <div className="h-4 w-px bg-border opacity-30 mx-0.5" />
                )}
              </div>
            );
          })}
          
          {/* Divider between custom pages and built-in tabs */}
          {visiblePages.length > 0 && (
            <div className="h-4 w-px bg-border opacity-50 mx-2 self-center" />
          )}
          
          {/* Built-in profile tabs */}
          {BUILT_IN_TABS.map((tab, index) => {
            const isActive = !isCustomPageActive && activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <div key={tab.id} className="flex items-center">
                <button
                  onClick={() => handleBuiltInTabClick(tab.id)}
                  className={cn(
                    'px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap relative',
                    'transition-colors duration-200 rounded-md',
                    'flex items-center gap-1.5',
                    isActive 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
                {index < BUILT_IN_TABS.length - 1 && (
                  <div className="h-4 w-px bg-border opacity-30 mx-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
