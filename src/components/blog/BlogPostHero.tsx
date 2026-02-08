interface BlogPostHeroProps {
  title: string;
  heroImage: string;
  imageSize?: string;
  imagePosition?: string;
}

const SIZE_CLASSES: Record<string, string> = {
  small: 'max-h-[300px] sm:max-h-[350px] lg:max-h-[400px]',
  medium: 'max-h-[400px] sm:max-h-[450px] lg:max-h-[500px]',
  large: 'max-h-[500px] sm:max-h-[550px] lg:max-h-[600px]',
  full: '',
};

export function BlogPostHero({ title, heroImage, imageSize = 'full', imagePosition = 'center center' }: BlogPostHeroProps) {
  const sizeClass = SIZE_CLASSES[imageSize] || '';
  const isFullSize = imageSize === 'full';

  return (
    <section
      className={`relative w-full overflow-hidden ${
        isFullSize
          ? 'aspect-[21/9] sm:aspect-[3/1] lg:aspect-[3/1] max-h-[500px]'
          : sizeClass
      }`}
      style={!isFullSize ? { minHeight: '200px' } : undefined}
    >
      <img
        src={heroImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: imagePosition }}
        loading="eager"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

      {/* Title */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-display leading-tight text-foreground max-w-4xl">
            {title}
          </h1>
        </div>
      </div>
    </section>
  );
}
