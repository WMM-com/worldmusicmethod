import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProfilePages } from '@/hooks/useProfilePages';
import { useExtendedProfile } from '@/hooks/useProfilePortfolio';
import { cn } from '@/lib/utils';

interface ProfileNavProps {
  userId: string;
  brandColor?: string;
}

export function ProfileNav({ userId, brandColor }: ProfileNavProps) {
  const navigate = useNavigate();
  const { slug: currentSlug } = useParams<{ slug?: string }>();
  const { data: profile } = useExtendedProfile(userId);
  const { data: pages = [] } = useProfilePages(userId);

  // Sort pages by order_index
  const sortedPages = useMemo(() => {
    return [...pages].sort((a, b) => a.order_index - b.order_index);
  }, [pages]);

  // Determine active page
  const activePage = useMemo(() => {
    if (!currentSlug || currentSlug === 'home') {
      return sortedPages.find(p => p.is_home);
    }
    return sortedPages.find(p => p.slug === currentSlug);
  }, [currentSlug, sortedPages]);

  const handleTabClick = (page: any) => {
    if (page.is_home) {
      navigate(`/@${profile?.username || userId}`);
    } else {
      navigate(`/@${profile?.username || userId}/${page.slug}`);
    }
  };

  if (!sortedPages.length) return null;

  return (
    <nav 
      className="border-b border-border bg-background sticky top-0 z-40"
      style={{
        '--brand-color': brandColor || 'hsl(var(--primary))',
      } as React.CSSProperties}
    >
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex min-w-min px-4 py-0">
          {sortedPages.map((page, index) => {
            const isActive = activePage?.id === page.id;
            return (
              <div key={page.id} className="flex items-center">
                <button
                  onClick={() => handleTabClick(page)}
                  className={cn(
                    'px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap relative',
                    'transition-colors duration-200',
                    'border-b-2',
                    isActive 
                      ? 'text-foreground border-b-current' 
                      : 'text-muted-foreground hover:text-foreground border-b-transparent hover:border-b-muted'
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
                  {page.title}
                </button>
                {index < sortedPages.length - 1 && (
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
