import { useNavigate } from 'react-router-dom';
import { Check, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useGeoPricing, formatPrice } from '@/hooks/useGeoPricing';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useRef } from 'react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

const MEMBERSHIP_PRODUCT_ID = 'bd5f4ade-1a22-41f0-a68d-b9be1a79ae3b';
const MEMBERSHIP_VIDEO_URL = 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Membership-Video.mp4';

const benefits = [
  '1000+ lessons in African, Asian, European & South American traditional music',
  'Guidance by top industry leading experts',
  'Synchronised tab and notation (or download it)',
  'Be part of a worldwide community of likeminded musicians',
];

export default function Membership() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { calculatePrice, isLoading: geoLoading } = useGeoPricing();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch the membership product
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['membership-product', MEMBERSHIP_PRODUCT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', MEMBERSHIP_PRODUCT_ID)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch product-specific regional pricing
  const { data: productRegionalPricing } = useQuery({
    queryKey: ['product-regional-pricing', MEMBERSHIP_PRODUCT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_regional_pricing')
        .select('region, discount_percentage, currency, fixed_price')
        .eq('product_id', MEMBERSHIP_PRODUCT_ID);
      if (error) throw error;
      return data || [];
    },
  });

  const priceInfo = product ? calculatePrice(product.base_price_usd, productRegionalPricing || []) : null;
  const isLoading = productLoading || geoLoading;

  const handleStartTrial = () => {
    if (product && priceInfo) {
      const added = addToCart({
        productId: product.id,
        name: product.name,
        price: priceInfo.price,
        currency: priceInfo.currency,
        productType: product.product_type,
      });
      if (!added) {
        toast.error('Cannot mix subscriptions and one-time purchases in the same cart. Please clear your cart first.');
        return;
      }
      navigate('/checkout');
    } else {
      navigate('/checkout');
    }
  };

  const handlePlayVideo = () => {
    setIsVideoPlaying(true);
    if (videoRef.current) {
      videoRef.current.play();
    }
    // Pause audio player when video starts
    window.dispatchEvent(new CustomEvent('pause-audio-player'));
  };

  const handleCloseVideo = () => {
    setIsVideoPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Start Your 7-Day Free Trial
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Access all World Music Method courses
            </p>

            {/* Benefits List */}
            <div className="max-w-xl mx-auto text-left mb-10">
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-base md:text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <div className="mb-6">
              {isLoading ? (
                <Skeleton className="h-14 w-72 mx-auto rounded-lg" />
              ) : priceInfo ? (
                <Button
                  size="lg"
                  onClick={handleStartTrial}
                  className="text-lg px-8 py-6 h-auto"
                >
                  Start Free Trial – then {formatPrice(priceInfo.price, priceInfo.currency)}/month
                </Button>
              ) : (
                <Button size="lg" onClick={handleStartTrial} className="text-lg px-8 py-6 h-auto">
                  Start Your Free Trial
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Cancel anytime (no questions asked)
            </p>
          </div>
        </div>

        {/* Video Section */}
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">What You'll Get</h2>
            <p className="text-muted-foreground">Watch this short video to learn more</p>
          </div>

          <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              src={MEMBERSHIP_VIDEO_URL}
              className="w-full h-full object-cover"
              controls={isVideoPlaying}
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              playsInline
              onEnded={() => setIsVideoPlaying(false)}
            />
            
            {/* Play button overlay */}
            {!isVideoPlaying && (
              <button
                onClick={handlePlayVideo}
                className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors group"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Play className="w-8 h-8 md:w-10 md:h-10 text-primary ml-1" />
                </div>
              </button>
            )}

            {/* Close button when playing */}
            {isVideoPlaying && (
              <button
                onClick={handleCloseVideo}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-muted/50 py-12 md:py-16">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to start your journey?</h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of musicians from around the world learning traditional music
            </p>
            
            {isLoading ? (
              <Skeleton className="h-14 w-72 max-w-full mx-auto rounded-lg" />
            ) : priceInfo ? (
              <Button
                size="lg"
                onClick={handleStartTrial}
                className="text-base sm:text-lg px-4 sm:px-8 py-6 h-auto max-w-full whitespace-normal"
              >
                Start Free Trial – then {formatPrice(priceInfo.price, priceInfo.currency)}/month
              </Button>
            ) : (
              <Button size="lg" onClick={handleStartTrial} className="text-base sm:text-lg px-4 sm:px-8 py-6 h-auto max-w-full whitespace-normal">
                Start Your Free Trial
              </Button>
            )}
            
            <p className="text-sm text-muted-foreground mt-4">
              7-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </>
  );
}