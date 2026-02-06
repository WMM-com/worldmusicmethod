import { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ProfileProject } from '@/hooks/useProfilePortfolio';
import { useExtendedProfile } from '@/hooks/useProfilePortfolio';
import { Link2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getProfileUrl } from '@/lib/profileUrl';
import { ProjectReportForm } from './ProjectReportForm';
import { Link } from 'react-router-dom';

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

  const handleCopyLink = () => {
    if (!project) return;
    const base = window.location.origin;
    const url = `${base}${profileUrl}?project=${project.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Project link copied');
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      onSelectProject(allProjects[currentIndex - 1]);
      setSliderIndex(0);
    }
  };

  const goToNext = () => {
    if (currentIndex < allProjects.length - 1) {
      onSelectProject(allProjects[currentIndex + 1]);
      setSliderIndex(0);
    }
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Outer wrapper with navigation arrows outside modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        {/* Left nav arrow – outside modal */}
        {currentIndex > 0 && (
          <button
            onClick={goToPrev}
            className="pointer-events-auto absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-[60] h-10 w-10 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-md border border-border shadow-lg hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right nav arrow – outside modal */}
        {currentIndex < allProjects.length - 1 && (
          <button
            onClick={goToNext}
            className="pointer-events-auto absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[60] h-10 w-10 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-md border border-border shadow-lg hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      <DialogContent className="max-w-[calc(100vw-120px)] w-full p-0 gap-0 overflow-hidden [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:rounded-full [&>button]:h-7 [&>button]:w-7 [&>button]:opacity-100 [&>button]:hover:bg-primary/90 [&>button]:right-3 [&>button]:top-3" style={{ maxHeight: 'calc(100vh - 80px)' }}>
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 pt-5 pb-3 border-b border-border bg-background/95 backdrop-blur-sm">
          <h2 className="text-lg font-semibold truncate pr-4">{project.title}</h2>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 mr-10"
          >
            <Link2 className="h-4 w-4" />
            Copy Link
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px - 58px)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Left column */}
            <div className="p-6 space-y-5">
              {/* Description */}
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

              {/* Published date */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Published</h3>
                <p className="text-sm">
                  {format(new Date(project.created_at), 'MMMM d, yyyy')}
                </p>
              </div>

              {/* External link */}
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

              {/* Report an issue */}
              <ProjectReportForm projectId={project.id} userId={userId} />
            </div>

            {/* Right column */}
            <div className="p-6 space-y-5">
              {/* Project image – full width, natural height */}
              {project.image_url && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={project.image_url}
                    alt={project.title}
                    className="w-full h-auto object-contain"
                  />
                </div>
              )}

              {/* More by user */}
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

                  {/* Slider */}
                  <div className="relative">
                    {/* Arrow left */}
                    {sliderIndex > 0 && (
                      <button
                        onClick={() => setSliderIndex((i) => Math.max(0, i - 1))}
                        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-md border border-border shadow-sm hover:bg-accent transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    )}

                    {/* Arrow right */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
