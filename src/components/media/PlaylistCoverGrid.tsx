import { ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaylistCoverGridProps {
  coverUrls: (string | null | undefined)[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PlaylistCoverGrid({ coverUrls, size = 'md', className }: PlaylistCoverGridProps) {
  const validCovers = coverUrls.filter((url): url is string => !!url).slice(0, 4);
  
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-16 w-16',
  };

  if (validCovers.length === 0) {
    return (
      <div className={cn(
        "rounded-lg bg-muted flex items-center justify-center aspect-square",
        className
      )}>
        <ListMusic className={cn(iconSizes[size], "text-muted-foreground")} />
      </div>
    );
  }

  if (validCovers.length === 1) {
    return (
      <img
        src={validCovers[0]}
        alt="Playlist cover"
        className={cn("rounded-lg object-cover aspect-square", className)}
      />
    );
  }

  // 2x2 grid for 2-4 images
  return (
    <div className={cn("rounded-lg overflow-hidden grid grid-cols-2 aspect-square", className)}>
      {validCovers.map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          className="w-full h-full object-cover"
        />
      ))}
      {/* Fill remaining slots if less than 4 */}
      {validCovers.length < 4 && [...Array(4 - validCovers.length)].map((_, i) => (
        <div key={`empty-${i}`} className="w-full h-full bg-muted flex items-center justify-center">
          <ListMusic className="h-4 w-4 text-muted-foreground/50" />
        </div>
      ))}
    </div>
  );
}