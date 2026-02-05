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
          'relative w-full min-h-[300px] md:min-h-[400px] overflow-hidden',
          className
        )}
      >
        {/* Background Image */}
        {backgroundImage && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}
        
        {/* Gradient Overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: backgroundColor 
              ? `linear-gradient(to top, ${backgroundColor}dd 0%, ${backgroundColor}66 50%, transparent 100%)`
              : 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.6) 50%, transparent 100%)'
          }}
        />
        
        {/* Content */}
        <div className={cn(
          'relative z-10 flex flex-col justify-end h-full min-h-[300px] md:min-h-[400px] p-6 md:p-10',
          textAlignClass
        )}>
          {subtitle && (
            <p className="text-sm md:text-base text-muted-foreground mb-2 uppercase tracking-wider">
              {subtitle}
            </p>
          )}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3">
            {displayTitle}
          </h1>
          {description && (
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
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
          'relative w-full min-h-[300px] md:min-h-[400px] overflow-hidden',
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
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between h-full min-h-[300px] md:min-h-[400px] p-6 md:p-10 gap-6">
          {/* Text Content */}
          <div className={cn(
            'flex flex-col flex-1',
            textAlignClass,
            textAlign === 'right' ? 'order-2' : 'order-1'
          )}>
            {subtitle && (
              <p className="text-sm md:text-base text-muted-foreground mb-2 uppercase tracking-wider">
                {subtitle}
              </p>
            )}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3">
              {displayTitle}
            </h1>
            {description && (
              <p className="text-base md:text-lg text-muted-foreground max-w-xl">
                {description}
              </p>
            )}
          </div>
          
          {/* Cutout Image */}
          {cutoutImage && (
            <div className={cn(
              'flex-shrink-0',
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
        'relative w-full min-h-[200px] md:min-h-[280px] overflow-hidden',
        className
      )}
      style={{
        backgroundColor: backgroundColor || 'hsl(var(--muted))',
      }}
    >
      <div className={cn(
        'flex flex-col justify-center h-full min-h-[200px] md:min-h-[280px] p-6 md:p-10',
        textAlignClass
      )}>
        {subtitle && (
          <p className="text-sm md:text-base text-muted-foreground mb-2 uppercase tracking-wider">
            {subtitle}
          </p>
        )}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3">
          {displayTitle}
        </h1>
        {description && (
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
