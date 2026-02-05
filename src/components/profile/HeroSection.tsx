import { cn } from '@/lib/utils';

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
  fallbackName?: string;
  className?: string;
}

export function HeroSection({ 
  heroType, 
  heroConfig, 
  fallbackName,
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

  const textAlignClass = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }[textAlign];

  // Standard: Full background image with overlay text
  if (heroType === 'standard') {
    return (
      <section
        className={cn(
          'relative w-full min-h-[320px] md:min-h-[420px] lg:min-h-[480px] overflow-hidden',
          className
        )}
        style={{
          backgroundColor: backgroundColor || 'hsl(var(--muted))',
        }}
      >
        {/* Background Image */}
        {backgroundImage && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}
        
        {/* Gradient Overlay - ensures text readability */}
        <div 
          className="absolute inset-0"
          style={{
            background: backgroundColor 
              ? `linear-gradient(to top, ${backgroundColor} 0%, ${backgroundColor}cc 40%, ${backgroundColor}66 70%, transparent 100%)`
              : 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.85) 40%, hsl(var(--background) / 0.5) 70%, transparent 100%)'
          }}
        />
        
        {/* Content */}
        <div className={cn(
          'relative z-10 flex flex-col justify-end h-full min-h-[320px] md:min-h-[420px] lg:min-h-[480px] p-6 md:p-10 lg:p-12',
          textAlignClass
        )}>
          {subtitle && (
            <p className="text-sm md:text-base font-medium text-white/80 mb-2 uppercase tracking-widest drop-shadow-md">
              {subtitle}
            </p>
          )}
          <h1 className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 text-white drop-shadow-lg">
            {displayTitle}
          </h1>
          {description && (
            <p className="text-base md:text-lg lg:text-xl text-white/90 max-w-2xl drop-shadow-md leading-relaxed">
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
          'relative w-full min-h-[320px] md:min-h-[420px] lg:min-h-[480px] overflow-hidden',
          className
        )}
        style={{
          backgroundColor: backgroundColor || 'hsl(var(--muted))',
        }}
      >
        {/* Background pattern or gradient */}
        {backgroundImage && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between h-full min-h-[320px] md:min-h-[420px] lg:min-h-[480px] p-6 md:p-10 lg:p-12 gap-8">
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
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 text-foreground">
              {displayTitle}
            </h1>
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
  return (
    <section
      className={cn(
        'relative w-full min-h-[240px] md:min-h-[320px] lg:min-h-[360px] overflow-hidden',
        className
      )}
      style={{
        backgroundColor: backgroundColor || 'hsl(var(--muted))',
      }}
    >
      <div className={cn(
        'flex flex-col justify-center h-full min-h-[240px] md:min-h-[320px] lg:min-h-[360px] p-6 md:p-10 lg:p-12',
        textAlignClass
      )}>
        {subtitle && (
          <p className="text-sm md:text-base font-medium text-foreground/70 mb-3 uppercase tracking-widest">
            {subtitle}
          </p>
        )}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 text-foreground">
          {displayTitle}
        </h1>
        {description && (
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
