import { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ProfileProject } from '@/hooks/useProfilePortfolio';
import { useExtendedProfile } from '@/hooks/useProfilePortfolio';
import { Link2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getProfileUrl } from '@/lib/profileUrl';
import { ProjectReportForm } from './ProjectReportForm';
import { Link, useLocation } from 'react-router-dom';

interface ProjectDetailModalProps {
  project: ProfileProject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  allProjects: ProfileProject[];
  onSelectProject: (project: ProfileProject) => void;
}

export function ProjectDetailModal({
  project,
  open,
  onOpenChange,
  userId,
  allProjects,
  onSelectProject,
}: ProjectDetailModalProps) {
  const { data: extendedProfile } = useExtendedProfile(userId);
  const location = useLocation();

  const currentIndex = useMemo(
    () => (project ? allProjects.findIndex((p) => p.id === project.id) : -1),
    [allProjects, project]
  );

  const otherProjects = useMemo(
    () => allProjects.filter((p) => p.id !== project?.id),
    [allProjects, project?.id]
  );

  const [sliderIndex, setSliderIndex] = useState(0);
  const visibleCount = 3;
  const maxSliderIndex = Math.max(0, otherProjects.length - visibleCount);

  const profileUrl = getProfileUrl(userId, extendedProfile?.username);
  const displayName = extendedProfile?.full_name || 'this artist';

  // Build the correct shareable URL including the current page slug
  const shareUrl = useMemo(() => {
    const base = window.location.origin;
    const pathname = location.pathname;
    
    // Owner route: /profile/pages/{slug} → use profileUrl/{slug}
    const ownerMatch = pathname.match(/^\/profile\/pages\/(.+)/);
    if (ownerMatch) {
      const slug = ownerMatch[1];
      // Don't append slug if it's "home"
      const pagePath = slug === 'home' ? profileUrl : `${profileUrl}/${slug}`;
      return `${base}${pagePath}`;
    }
    
    // Public route: /@username/{slug} or /username/{slug} → use current pathname
    // The pathname already contains the correct public path
    return `${base}${pathname}`;
  }, [location.pathname, profileUrl]);

  const handleCopyLink = () => {
    if (!project) return;
    const url = `${shareUrl}?project=${project.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Project link copied');
  };

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (currentIndex > 0) {
      onSelectProject(allProjects[currentIndex - 1]);
      setSliderIndex(0);
    }
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (currentIndex < allProjects.length - 1) {
      onSelectProject(allProjects[currentIndex + 1]);
      setSliderIndex(0);
    }
  };

  const navRef = useRef<HTMLDivElement>(null);

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Navigation arrows – rendered outside DialogContent but inside Dialog */}
      {open && (
        <div
          ref={navRef}
          className="fixed inset-0 z-[60] pointer-events-none"
          style={{ isolation: 'isolate' }}
        >
          {currentIndex > 0 && (
            <button
              data-project-nav="prev"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={goToPrev}
              className="pointer-events-auto absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center rounded-full bg-primary/25 backdrop-blur-md shadow-lg opacity-30 hover:opacity-100 hover:bg-primary/80 active:opacity-100 active:bg-primary/90 transition-all duration-200"
            >
              <ChevronLeft className="h-6 w-6 text-primary-foreground" />
            </button>
          )}

          {currentIndex < allProjects.length - 1 && (
            <button
              data-project-nav="next"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={goToNext}
              className="pointer-events-auto absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center rounded-full bg-primary/25 backdrop-blur-md shadow-lg opacity-30 hover:opacity-100 hover:bg-primary/80 active:opacity-100 active:bg-primary/90 transition-all duration-200"
            >
              <ChevronRight className="h-6 w-6 text-primary-foreground" />
            </button>
          )}
        </div>
      )}

      <DialogContent
        className="max-w-[calc(100vw-120px)] w-full p-0 gap-0 overflow-hidden flex flex-col [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:rounded-full [&>button]:h-7 [&>button]:w-7 [&>button]:opacity-100 [&>button]:hover:bg-primary/90 [&>button]:right-3 [&>button]:top-3 [&>button]:z-30"
        style={{ maxHeight: 'calc(100vh - 80px)' }}
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking navigation arrows
          const target = e.target as HTMLElement;
          if (target.closest('[data-project-nav]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-project-nav]')) {
            e.preventDefault();
          }
        }}
      >

        {/* Sticky Header */}
        <div className="shrink-0 flex items-center justify-between px-6 pt-5 pb-3 border-b border-border bg-background">
          <h2 className="text-lg font-semibold truncate pr-4">{project.title}</h2>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 mr-10"
          >
            <Link2 className="h-4 w-4" />
            Copy Link
          </button>
        </div>

        {/* Body – two columns with independent scrolling */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2">
          {/* Left column – static (no scroll) */}
          <div className="p-6 space-y-5 overflow-y-auto md:overflow-y-hidden">
            {project.description ? (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description provided.</p>
            )}

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Published</h3>
              <p className="text-sm">
                {format(new Date(project.created_at), 'MMMM d, yyyy')}
              </p>
            </div>

            {project.external_url && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Project Link</h3>
                <a
                  href={project.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {project.external_url}
                </a>
              </div>
            )}

            <ProjectReportForm projectId={project.id} userId={userId} projectTitle={project.title} />
          </div>

          {/* Right column – scrollable */}
          <div className="p-6 space-y-5 overflow-y-auto">
            {project.image_url && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={project.image_url}
                  alt={project.title}
                  className="w-full h-auto object-contain"
                />
              </div>
            )}

            {otherProjects.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  More by{' '}
                  <Link
                    to={profileUrl}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {displayName}
                  </Link>
                </p>

                <div className="relative">
                  {sliderIndex > 0 && (
                    <button
                      onClick={() => setSliderIndex((i) => Math.max(0, i - 1))}
                      className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-md border border-border shadow-sm hover:bg-accent transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}

                  {sliderIndex < maxSliderIndex && (
                    <button
                      onClick={() => setSliderIndex((i) => Math.min(maxSliderIndex, i + 1))}
                      className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-md border border-border shadow-sm hover:bg-accent transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}

                  <div className="overflow-hidden">
                    <div
                      className="flex gap-3 transition-transform duration-300"
                      style={{
                        transform: `translateX(-${sliderIndex * (100 / visibleCount)}%)`,
                      }}
                    >
                      {otherProjects.map((op) => (
                        <button
                          key={op.id}
                          onClick={() => {
                            onSelectProject(op);
                            setSliderIndex(0);
                          }}
                          className="shrink-0 rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-colors text-left"
                          style={{ width: `calc(${100 / visibleCount}% - ${((visibleCount - 1) * 12) / visibleCount}px)` }}
                        >
                          {op.image_url ? (
                            <img
                              src={op.image_url}
                              alt={op.title}
                              className="w-full aspect-[4/3] object-cover"
                            />
                          ) : (
                            <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">No image</span>
                            </div>
                          )}
                          <div className="p-2.5">
                            <p className="text-sm font-medium leading-snug">{op.title}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
