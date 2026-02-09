import { cn } from '@/lib/utils';
import { CoverSettings } from '@/hooks/useHeroSettings';

export type HeroType = 'standard' | 'slay' | 'cut-out' | 'minimal';

export interface HeroConfig {
  title?: string;
  subtitle?: string;
  description?: string;
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  backgroundImage?: string;
  cutoutImage?: string;
  // Overlay
  overlayEnabled?: boolean;
  overlayColor?: string;
  overlayOpacity?: number; // 0-100
  // Text styling
  fontSize?: number; // px value, default 48
  lineHeight?: number; // px value, default 56
  letterSpacing?: number; // px value, default 0
  // Image sizing/positioning
  imageSize?: 'cover' | 'contain' | 'auto';
  imagePosition?: 'top' | 'center' | 'bottom' | 'left' | 'right';
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

// Build inline text styles from numeric px values
function getTextStyle(config: HeroConfig): React.CSSProperties {
  return {
    fontSize: config.fontSize ? `${config.fontSize}px` : undefined,
    lineHeight: config.lineHeight ? `${config.lineHeight}px` : undefined,
    letterSpacing: config.letterSpacing ? `${config.letterSpacing}px` : undefined,
  };
}

function getImageSizeStyle(size?: HeroConfig['imageSize']) {
  switch (size) {
    case 'contain': return 'contain';
    case 'auto': return 'auto';
    default: return 'cover';
  }
}

function getImagePositionStyle(pos?: HeroConfig['imagePosition']) {
  switch (pos) {
    case 'top': return 'top center';
    case 'bottom': return 'bottom center';
    case 'left': return 'center left';
    case 'right': return 'center right';
    default: return undefined; // use focal point
  }
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
    overlayEnabled,
    overlayColor,
    overlayOpacity,
    fontSize,
    lineHeight,
    letterSpacing,
    imageSize,
    imagePosition,
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

  const textStyle = getTextStyle(heroConfig);
  
  const bgSize = getImageSizeStyle(imageSize);
  const bgPosition = getImagePositionStyle(imagePosition) || focalPoint;

  // Overlay style
  const overlayStyle = overlayEnabled ? {
    backgroundColor: overlayColor || 'rgba(0,0,0,0.5)',
    opacity: (overlayOpacity ?? 40) / 100,
  } : undefined;

  // Standard: Cover image only, no text overlay
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
        {actualBackgroundImage && (
          <div
            className="absolute inset-0"
            style={{ 
              backgroundImage: `url(${actualBackgroundImage})`,
              backgroundSize: bgSize,
              backgroundPosition: bgPosition,
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}
        
        {/* Overlay */}
        {overlayEnabled ? (
          <div className="absolute inset-0 pointer-events-none" style={overlayStyle} />
        ) : (
          <div className="absolute inset-0 pointer-events-none bg-black/20" />
        )}
        
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background) / 0.4) 0%, transparent 40%)'
          }}
        />
      </section>
    );
  }

  // Slay: Full background image WITH text overlay
  if (heroType === 'slay') {
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
        {actualBackgroundImage && (
          <div
            className="absolute inset-0"
            style={{ 
              backgroundImage: `url(${actualBackgroundImage})`,
              backgroundSize: bgSize,
              backgroundPosition: bgPosition,
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}
        
        {/* Overlay */}
        {overlayEnabled ? (
          <div className="absolute inset-0 pointer-events-none" style={overlayStyle} />
        ) : (
          <div className="absolute inset-0 pointer-events-none bg-black/20" />
        )}
        
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background) / 0.4) 0%, transparent 40%)'
          }}
        />

        {/* Text content */}
        <div className={cn(
          'relative z-10 flex flex-col justify-center h-full p-6 md:p-10 lg:p-12',
          heroHeightClass,
          textAlignClass
        )}>
          {subtitle && (
            <p className="text-sm md:text-base font-medium text-white/70 mb-3 uppercase" style={{ letterSpacing: textStyle.letterSpacing }}>
              {subtitle}
            </p>
          )}
          {(title || fallbackName) && (
            <h1 className="font-bold mb-4 text-white drop-shadow-lg text-3xl md:text-5xl lg:text-6xl" style={textStyle}>
              {displayTitle}
            </h1>
          )}
          {description && (
            <p className={cn("text-base md:text-lg lg:text-xl text-white/80 max-w-2xl leading-relaxed drop-shadow")}>
              {description}
            </p>
          )}
        </div>
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
              <h1 className="font-bold mb-4 text-foreground text-3xl md:text-5xl lg:text-6xl" style={textStyle}>
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
          <h1 className="font-bold mb-4 text-foreground text-3xl md:text-5xl lg:text-6xl" style={textStyle}>
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
