import { cn } from '@/lib/utils';
import { CoverSettings } from '@/hooks/useHeroSettings';

export type HeroType = 'standard' | 'cut-out' | 'minimal';

export interface HeroConfig {
  title?: string;
  subtitle?: string;
  description?: string;
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  backgroundImage?: string;
  cutoutImage?: string;
}

interface HeroSectionProps {
  heroType: HeroType;
  heroConfig: HeroConfig;
  coverSettings?: CoverSettings;
  fallbackName?: string;
  fallbackCoverImage?: string | null;
  className?: string;
}

// Get height class from cover settings
function getHeroHeightClass(height?: CoverSettings['height']): string {
  switch (height) {
    case 'small': return 'min-h-[192px] md:min-h-[240px]';
    case 'large': return 'min-h-[400px] md:min-h-[480px] lg:min-h-[540px]';
    case 'medium':
    default: return 'min-h-[320px] md:min-h-[420px] lg:min-h-[480px]';
  }
}

// Get focal point style from cover settings
function getFocalPointStyle(settings?: CoverSettings): string {
  const x = settings?.focalPointX ?? 50;
  const y = settings?.focalPointY ?? 50;
  return `${x}% ${y}%`;
}

export function HeroSection({ 
  heroType, 
  heroConfig, 
  coverSettings,
  fallbackName,
  fallbackCoverImage,
  className 
}: HeroSectionProps) {
  const {
    title,
    subtitle,
    description,
    textAlign = 'center',
    backgroundColor,
    backgroundImage,
    cutoutImage,
  } = heroConfig;

  const displayTitle = title || fallbackName || 'Welcome';
  const heroHeightClass = getHeroHeightClass(coverSettings?.height);
  const focalPoint = getFocalPointStyle(coverSettings);
  
  // Use hero background image OR fallback cover image
  const actualBackgroundImage = backgroundImage || fallbackCoverImage;

  const textAlignClass = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }[textAlign];

  // Standard: Full background image (cover image only, no text overlay)
  if (heroType === 'standard') {
    return (
      <section
        className={cn(
          'relative w-full overflow-hidden',
          heroHeightClass,
          className
        )}
        style={{
          backgroundColor: backgroundColor || 'hsl(var(--muted))',
        }}
      >
        {/* Background Image */}
        {actualBackgroundImage && (
          <div
            className="absolute inset-0 bg-cover"
            style={{ 
              backgroundImage: `url(${actualBackgroundImage})`,
              backgroundPosition: focalPoint,
            }}
          />
        )}
        
        {/* Dark overlay for better contrast */}
        <div 
          className="absolute inset-0 pointer-events-none bg-black/20"
        />
        
        {/* Gradient overlay at bottom for visual polish */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background) / 0.4) 0%, transparent 40%)'
          }}
        />
      </section>
    );
  }

  // Cut-out: Transparent PNG cutout over solid/gradient background
  if (heroType === 'cut-out') {
    return (
      <section
        className={cn(
          'relative w-full overflow-hidden',
          heroHeightClass,
          className
        )}
        style={{
          backgroundColor: backgroundColor || 'hsl(var(--muted))',
        }}
      >
        <div className={cn(
          'relative z-10 flex flex-col md:flex-row items-center justify-between h-full p-6 md:p-10 lg:p-12 gap-8',
          heroHeightClass,
        )}>
          {/* Text Content */}
          <div className={cn(
            'flex flex-col flex-1 justify-center',
            textAlignClass,
            textAlign === 'right' ? 'order-2' : 'order-1'
          )}>
            {subtitle && (
              <p className="text-sm md:text-base font-medium text-foreground/70 mb-3 uppercase tracking-widest">
                {subtitle}
              </p>
            )}
            {(title || fallbackName) && (
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 text-foreground">
                {displayTitle}
              </h1>
            )}
            {description && (
              <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-xl leading-relaxed">
                {description}
              </p>
            )}
          </div>
          
          {/* Cutout Image */}
          {cutoutImage && (
            <div className={cn(
              'flex-shrink-0 flex items-center justify-center',
              textAlign === 'right' ? 'order-1' : 'order-2'
            )}>
              <img
                src={cutoutImage}
                alt={displayTitle}
                className="w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 object-contain drop-shadow-2xl"
              />
            </div>
          )}
        </div>
      </section>
    );
  }

  // Minimal: Solid color background with centered text
  const minimalHeightClass = coverSettings?.height === 'large' 
    ? 'min-h-[300px] md:min-h-[360px]' 
    : coverSettings?.height === 'small' 
      ? 'min-h-[160px] md:min-h-[200px]'
      : 'min-h-[240px] md:min-h-[320px] lg:min-h-[360px]';

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden',
        minimalHeightClass,
        className
      )}
      style={{
        backgroundColor: backgroundColor || 'hsl(var(--muted))',
      }}
    >
      <div className={cn(
        'flex flex-col justify-center h-full p-6 md:p-10 lg:p-12',
        minimalHeightClass,
        textAlignClass
      )}>
        {subtitle && (
          <p className="text-sm md:text-base font-medium text-foreground/70 mb-3 uppercase tracking-widest">
            {subtitle}
          </p>
        )}
        {(title || fallbackName) && (
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 text-foreground">
            {displayTitle}
          </h1>
        )}
        {description && (
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
