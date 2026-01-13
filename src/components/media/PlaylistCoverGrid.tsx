import { ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaylistCoverGridProps {
  coverUrls: (string | null | undefined)[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PlaylistCoverGrid({ coverUrls, size = 'md', className }: PlaylistCoverGridProps) {
  const validCovers = coverUrls.filter((url): url is string => !!url).slice(0, 4);
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-48 h-48',
  };

  if (validCovers.length === 0) {
    return (
      <div className={cn(
        sizeClasses[size],
        "rounded-lg bg-muted flex items-center justify-center",
        className
      )}>
        <ListMusic className={cn(
          size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-8 w-8' : 'h-16 w-16',
          "text-muted-foreground"
        )} />
      </div>
    );
  }

  if (validCovers.length === 1) {
    return (
      <img
        src={validCovers[0]}
        alt="Playlist cover"
        className={cn(sizeClasses[size], "rounded-lg object-cover", className)}
      />
    );
  }

  // 2x2 grid for 2-4 images
  return (
    <div className={cn(sizeClasses[size], "rounded-lg overflow-hidden grid grid-cols-2", className)}>
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