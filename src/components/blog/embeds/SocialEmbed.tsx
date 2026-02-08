interface SocialEmbedProps {
  src: string;
  platform: 'instagram' | 'facebook' | 'tiktok';
  title?: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
};

export function SocialEmbed({ src, platform, title }: SocialEmbedProps) {
  const label = PLATFORM_LABELS[platform] ?? platform;

  return (
    <div className="blog-embed blog-embed--social">
      <iframe
        src={src}
        title={title || `${label} embed`}
        allowFullScreen
        loading="lazy"
        scrolling="no"
      />
      <div className="blog-embed__bar blog-embed__bar--social">
        <span className="text-xs text-muted-foreground">{label}</span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View on {label} ↗
        </a>
      </div>
    </div>
  );
}
