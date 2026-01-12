import { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Fallback src while loading or on error */
  fallbackSrc?: string;
  /** Whether to show a skeleton while loading */
  showSkeleton?: boolean;
  /** Custom skeleton className */
  skeletonClassName?: string;
  /** Intersection observer options */
  observerOptions?: IntersectionObserverInit;
}

/**
 * Lazy-loaded image component using Intersection Observer
 * Only loads images when they enter the viewport
 */
export function LazyImage({
  src,
  alt,
  className,
  fallbackSrc = '/placeholder.svg',
  showSkeleton = true,
  skeletonClassName,
  observerOptions,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0,
        ...observerOptions,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [observerOptions]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  const imageSrc = isInView ? (hasError ? fallbackSrc : src) : undefined;

  return (
    <div className={cn('relative', className)} ref={imgRef as any}>
      {/* Skeleton placeholder */}
      {showSkeleton && !isLoaded && (
        <Skeleton 
          className={cn(
            'absolute inset-0 w-full h-full',
            skeletonClassName
          )} 
        />
      )}
      
      {/* Actual image */}
      <img
        {...props}
        src={imageSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

/**
 * Background image version of LazyImage
 * Uses a div with background-image instead of img tag
 */
export function LazyBackgroundImage({
  src,
  className,
  fallbackSrc = '/placeholder.svg',
  showSkeleton = true,
  children,
  style,
  ...props
}: LazyImageProps & { children?: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0,
      }
    );

    if (divRef.current) {
      observer.observe(divRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Preload image
  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    img.onload = () => {
      setIsLoaded(true);
      setHasError(false);
    };
    img.onerror = () => {
      setHasError(true);
      setIsLoaded(true);
    };
    img.src = src;
  }, [isInView, src]);

  const imageSrc = isInView && isLoaded ? (hasError ? fallbackSrc : src) : undefined;

  return (
    <div
      ref={divRef}
      className={cn('relative', className)}
      style={{
        ...style,
        backgroundImage: imageSrc ? `url(${imageSrc})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      {...props}
    >
      {showSkeleton && !isLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      {children}
    </div>
  );
}
