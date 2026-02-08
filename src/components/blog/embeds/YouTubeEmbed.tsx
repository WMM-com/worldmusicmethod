import { useState } from 'react';
import { Play } from 'lucide-react';

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
}

export function YouTubeEmbed({ videoId, title = 'YouTube Video' }: YouTubeEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  if (isPlaying) {
    return (
      <div className="blog-embed blog-embed--youtube">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="blog-embed blog-embed--youtube blog-embed--preview group">
      {/* Thumbnail */}
      <img
        src={thumbnailUrl}
        alt={title}
        className="blog-embed__thumbnail"
        loading="lazy"
      />

      {/* Dark overlay */}
      <div className="blog-embed__overlay" />

      {/* Play button */}
      <button
        onClick={() => setIsPlaying(true)}
        className="blog-embed__play-btn"
        aria-label={`Play ${title}`}
      >
        <div className="blog-embed__play-icon">
          <Play className="size-8 text-foreground fill-foreground ml-1" />
        </div>
      </button>

      {/* Bottom bar */}
      <div className="blog-embed__bar">
        <div className="flex items-center gap-2 min-w-0">
          <svg viewBox="0 0 28 20" className="size-5 shrink-0 fill-[#FF0000]">
            <path d="M27.4 3.1s-.3-1.9-1.1-2.7C25.1-.8 23.7-.8 23-.9 19.2-1.2 14-1.2 14-1.2h0s-5.2 0-9 .3c-.6.1-2 .1-3.2 1.2C1 1.2.7 3.1.7 3.1S.4 5.3.4 7.6v2.1c0 2.2.3 4.5.3 4.5s.3 1.9 1.1 2.7c1.2 1.2 2.7 1.1 3.4 1.3 2.5.2 10.8.3 10.8.3s5.2 0 9-.3c.6-.1 2-.1 3.2-1.2.8-.9 1.1-2.7 1.1-2.7s.3-2.2.3-4.5V7.6c0-2.2-.3-4.5-.3-4.5z" />
            <path fill="#fff" d="M11.2 13.2V5.4l8.6 3.9z" />
          </svg>
          <span className="text-sm font-medium text-foreground truncate">{title}</span>
        </div>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          Watch on YouTube
        </a>
      </div>
    </div>
  );
}
