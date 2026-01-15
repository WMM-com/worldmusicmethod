import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  X, 
  CheckCircle, 
  Globe, 
  Award, 
  Users, 
  BookOpen, 
  Music,
  Headphones,
  Shield,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useGeoPricing, formatPrice } from '@/hooks/useGeoPricing';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/contexts/CartContext';
import { useMediaPlayer } from '@/contexts/MediaPlayerContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

const MEMBERSHIP_PRODUCT_ID = 'bd5f4ade-1a22-41f0-a68d-b9be1a79ae3b';
const MEMBERSHIP_VIDEO_URL = 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2024/11/Membership-Video.mp4';

const highlights = [
  { 
    icon: Globe, 
    title: 'Global Library',
    description: '1000+ lessons in African, Asian, European & South American traditional music'
  },
  { 
    icon: Award, 
    title: 'Expert Instruction',
    description: 'Learn from industry-leading professionals and culture experts'
  },
  { 
    icon: Music, 
    title: 'Interactive Tools',
    description: 'Synchronised tab, notation & downloadable PDFs for every lesson'
  },
  { 
    icon: Users, 
    title: 'Community',
    description: 'Join a worldwide community of likeminded musicians'
  },
];

const features = [
  'Full access to all courses',
  'New content added regularly', 
  'Interactive notation & tab',
  'Downloadable resources',
  'Community features',
  'Cancel anytime',
];

// Sticky CTA that adjusts for audio player
function StickyCTAButton({ 
  showStickyCTA, 
  priceInfo, 
  handleStartTrial 
}: { 
  showStickyCTA: boolean;
  priceInfo: { price: number; currency: string } | null;
  handleStartTrial: () => void;
}) {
  const { currentTrack } = useMediaPlayer();
  const [isAudioPlayerMinimized, setIsAudioPlayerMinimized] = useState(false);
  const [isAudioPlayerExpanded, setIsAudioPlayerExpanded] = useState(false);

  useEffect(() => {
    const handleAudioPlayerState = (e: CustomEvent<{ isMinimized: boolean; isExpanded: boolean }>) => {
      setIsAudioPlayerMinimized(e.detail.isMinimized);
      setIsAudioPlayerExpanded(e.detail.isExpanded);
    };

    window.addEventListener('audio-player-state', handleAudioPlayerState as EventListener);
    return () => window.removeEventListener('audio-player-state', handleAudioPlayerState as EventListener);
  }, []);

  const hasVisibleAudioPlayer = currentTrack && !isAudioPlayerMinimized;
  
  let bottomClass = 'bottom-0';
  if (hasVisibleAudioPlayer) {
    bottomClass = isAudioPlayerExpanded ? 'bottom-[176px]' : 'bottom-20';
  }

  if (!showStickyCTA) return null;

  return (
    <AnimatePresence>
      <motion.div
        data-chat-popup-obstacle="bottom"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`fixed ${bottomClass} left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border shadow-lg transition-all duration-300`}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {priceInfo && (
              <p className="text-lg font-bold text-yellow-500">
                {formatPrice(priceInfo.price, priceInfo.currency)}/month
              </p>
            )}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-600">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">7-day free trial</span>
            </div>
          </div>
          <Button 
            size="default" 
            onClick={handleStartTrial} 
            className="gap-2 shrink-0"
          >
            Start Free Trial
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Membership() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { addToCart } = useCart();
  const { calculatePrice, isLoading: geoLoading } = useGeoPricing();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

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

  // Show sticky CTA when scrolled past hero
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const heroBottom = heroRef.current.getBoundingClientRect().bottom;
        setShowStickyCTA(heroBottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        <section ref={heroRef} className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
          
          <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-24">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center mb-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">7-Day Free Trial</span>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-4 md:mb-6"
            >
              Unlock Your Full
              <span className="block text-primary">Musical Potential</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground text-center max-w-2xl mx-auto mb-8 md:mb-12"
            >
              Access the world's most comprehensive library of traditional music courses, 
              taught by industry-leading experts.
            </motion.p>

            {/* Mobile Layout: Video First */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mb-8"
              >
                {/* Video */}
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
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
                  
                  {!isVideoPlaying && (
                    <button
                      onClick={handlePlayVideo}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors group"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
                      </div>
                    </button>
                  )}

                  {isVideoPlaying && (
                    <button
                      onClick={handleCloseVideo}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* CTA Section - Mobile */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-center space-y-4 mb-12"
              >
                {/* Price */}
                {isLoading ? (
                  <Skeleton className="h-12 w-40 mx-auto rounded-lg" />
                ) : priceInfo && (
                  <div className="space-y-1">
                    <p className="text-4xl font-bold text-secondary">
                      {formatPrice(priceInfo.price, priceInfo.currency)}
                      <span className="text-lg font-normal text-muted-foreground">/month</span>
                    </p>
                    <p className="text-sm text-muted-foreground">after your free trial</p>
                  </div>
                )}
                
                {/* CTA Button */}
                <Button
                  size="lg"
                  onClick={handleStartTrial}
                  className="w-full text-lg py-7 h-auto"
                >
                  Start Your Free Trial
                </Button>
                
                <p className="text-sm text-muted-foreground">
                  No commitment. Cancel anytime.
                </p>
              </motion.div>
            )}

            {/* Desktop Layout: Two Columns */}
            {!isMobile && (
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left: CTA Content */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="space-y-8"
                >
                  {/* Price Card */}
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                    {/* Price */}
                    {isLoading ? (
                      <Skeleton className="h-14 w-48 rounded-lg" />
                    ) : priceInfo && (
                      <div className="space-y-1">
                        <p className="text-5xl font-bold text-secondary">
                          {formatPrice(priceInfo.price, priceInfo.currency)}
                          <span className="text-xl font-normal text-muted-foreground">/month</span>
                        </p>
                        <p className="text-muted-foreground">after your 7-day free trial</p>
                      </div>
                    )}
                    
                    {/* Features list */}
                    <ul className="grid grid-cols-2 gap-3">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Button
                      size="lg"
                      onClick={handleStartTrial}
                      className="w-full text-lg py-6 h-auto"
                    >
                      Start Your Free Trial
                    </Button>
                    
                    <p className="text-center text-sm text-muted-foreground">
                      No commitment • Cancel anytime
                    </p>
                  </div>
                </motion.div>

                {/* Right: Video */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
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
                    
                    {!isVideoPlaying && (
                      <button
                        onClick={handlePlayVideo}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors group"
                      >
                        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                          <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                        </div>
                      </button>
                    )}

                    {isVideoPlaying && (
                      <button
                        onClick={handleCloseVideo}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </section>

        {/* Highlights Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-4xl font-bold mb-4">
                Everything You Need to
                <span className="text-primary"> Master World Music</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From African rhythms to Latin American melodies, unlock centuries of musical tradition with our comprehensive courses.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {highlights.map((highlight, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-card rounded-xl border border-border p-6 text-center hover:border-primary/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <highlight.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{highlight.title}</h3>
                  <p className="text-sm text-muted-foreground">{highlight.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof / Trust Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <div className="flex justify-center gap-8 md:gap-16 flex-wrap">
                <div className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-primary">1000+</p>
                  <p className="text-sm text-muted-foreground mt-1">Video Lessons</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-primary">50+</p>
                  <p className="text-sm text-muted-foreground mt-1">Expert Instructors</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-primary">30+</p>
                  <p className="text-sm text-muted-foreground mt-1">Music Traditions</p>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-green-600">
                <Shield className="w-5 h-5" />
                <span className="font-medium">30-Day 110% Money-Back Guarantee</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <h2 className="text-2xl md:text-4xl font-bold">
                Ready to Start Your Journey?
              </h2>
              <p className="text-muted-foreground">
                Join thousands of musicians expanding their musical vocabulary with world music traditions.
              </p>
              
              {isLoading ? (
                <Skeleton className="h-12 w-40 mx-auto rounded-lg" />
              ) : priceInfo && (
                <p className="text-3xl font-bold text-secondary">
                  {formatPrice(priceInfo.price, priceInfo.currency)}
                  <span className="text-lg font-normal text-muted-foreground">/month</span>
                </p>
              )}
              
              <Button
                size="lg"
                onClick={handleStartTrial}
                className="text-lg px-12 py-6 h-auto"
              >
                Start Your 7-Day Free Trial
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Cancel anytime • No questions asked
              </p>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Sticky CTA */}
      <StickyCTAButton 
        showStickyCTA={showStickyCTA} 
        priceInfo={priceInfo} 
        handleStartTrial={handleStartTrial} 
      />
    </>
  );
}