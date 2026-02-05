import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfilePages } from '@/hooks/useProfilePages';
import { useExtendedProfile } from '@/hooks/useProfilePortfolio';
import { cn } from '@/lib/utils';
import { Home, User, FileText, Image } from 'lucide-react';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

interface ProfileNavProps {
  userId: string;
  brandColor?: string;
  isOwnProfile?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onPageNavigate?: () => void;
  isEditing?: boolean;
  onExitEditMode?: () => void;
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
  isEditing = false,
  onExitEditMode,
}: ProfileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: profile } = useExtendedProfile(userId);
  const { data: pages = [] } = useProfilePages(userId);

  // State for unsaved changes dialog
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{ type: 'page' | 'tab'; target: any } | null>(null);

  // Check if we're on /profile route (own profile management)
  const isOnProfileRoute = location.pathname === '/profile' || location.pathname.startsWith('/profile/pages');

  // Extract slug directly from pathname for more reliable detection
  const currentSlug = useMemo(() => {
    // For /profile/pages/:slug routes
    const pagesMatch = location.pathname.match(/\/profile\/pages\/([^/]+)/);
    if (pagesMatch) return pagesMatch[1];
    
    // For /@username/:slug routes
    const usernameMatch = location.pathname.match(/\/@[^/]+\/([^/]+)/);
    if (usernameMatch) return usernameMatch[1];
    
    // No slug means home page
    return null;
  }, [location.pathname]);

  // Filter to only visible pages (unless editing own profile)
  const visiblePages = useMemo(() => {
    const sorted = [...pages].sort((a, b) => a.order_index - b.order_index);
    if (isOwnProfile) return sorted; // Show all pages when editing
    return sorted.filter(p => p.is_visible);
  }, [pages, isOwnProfile]);

  // Determine active page based on current URL
  const activePage = useMemo(() => {
    if (!currentSlug || currentSlug === 'home') {
      return visiblePages.find(p => p.is_home) || null;
    }
    return visiblePages.find(p => p.slug === currentSlug) || null;
  }, [currentSlug, visiblePages]);

  // Execute navigation after user confirms
  const executeNavigation = (navAction: { type: 'page' | 'tab'; target: any }) => {
    if (navAction.type === 'page') {
      const page = navAction.target;
      if (isOnProfileRoute) {
        onPageNavigate?.();
        if (page.is_home) {
          navigate('/profile', { replace: false });
          onTabChange?.('page');
        } else {
          navigate(`/profile/pages/${page.slug}`, { replace: false });
          onTabChange?.('page');
        }
      } else {
        const username = profile?.username || userId;
        if (page.is_home) {
          navigate(`/@${username}`);
        } else {
          navigate(`/@${username}/${page.slug}`);
        }
      }
    } else if (navAction.type === 'tab') {
      onTabChange?.(navAction.target);
    }
  };

  const handlePageClick = (page: any) => {
    // Check if clicking on the already active page
    const isCurrentPage = activePage?.id === page.id;
    if (isCurrentPage) return;

    // If editing, show unsaved changes dialog
    if (isEditing && isOwnProfile) {
      setPendingNavigation({ type: 'page', target: page });
      setShowUnsavedDialog(true);
      return;
    }

    // Execute navigation directly
    executeNavigation({ type: 'page', target: page });
  };

  const handleBuiltInTabClick = (tabId: string) => {
    // Check if clicking on the already active tab
    if (activeTab === tabId) return;

    // If editing, show unsaved changes dialog
    if (isEditing && isOwnProfile) {
      setPendingNavigation({ type: 'tab', target: tabId });
      setShowUnsavedDialog(true);
      return;
    }

    onTabChange?.(tabId);
  };

  const handleSaveAndNavigate = () => {
    // Exit edit mode (save changes)
    onExitEditMode?.();
    
    // Execute pending navigation
    if (pendingNavigation) {
      executeNavigation(pendingNavigation);
    }
    
    // Reset state
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  // Determine if a custom page is active (for highlighting logic)
  const isCustomPageActive = activeTab === 'page';

  return (
    <>
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

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onSave={handleSaveAndNavigate}
        onDiscard={handleCancelNavigation}
      />
    </>
  );
}
