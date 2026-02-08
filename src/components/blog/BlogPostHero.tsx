import { LazyImage } from '@/components/ui/lazy-image';

interface BlogPostHeroProps {
  title: string;
  heroImage: string;
}

export function BlogPostHero({ title, heroImage }: BlogPostHeroProps) {
  return (
    <section className="relative w-full aspect-[21/9] sm:aspect-[3/1] lg:aspect-[3/1] max-h-[500px] overflow-hidden">
      <img
        src={heroImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
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
