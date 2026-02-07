import { useState, useRef, useEffect } from 'react';
// Home page
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Play, 
  X, 
  MousePointerClick,
  SlidersHorizontal,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SoundsliceEmbed } from '@/components/courses/SoundsliceEmbed';
import { StudentStoriesSection } from '@/components/home/StudentStoriesSection';
import { PartnersSection } from '@/components/home/PartnersSection';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useIsMobile } from '@/hooks/use-mobile';

import guitarImg from '@/assets/lessons/guitar.jpg';
import bassImg from '@/assets/lessons/bass.jpg';
import drumsImg from '@/assets/lessons/drums.jpg';
import vocalsImg from '@/assets/lessons/vocals.jpg';

const HERO_VIDEO_URL = 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2026/02/Funnel-Trailer-YT-FINAL-2.mp4';

const instruments = [
  { 
    id: 'guitar', 
    label: 'Guitar', 
    sliceId: 'M7kTc', 
    preset: 'guitar' as const,
    placeholder: guitarImg,
  },
  { 
    id: 'bass', 
    label: 'Bass', 
    sliceId: 'w7kTc', 
    preset: 'bass' as const,
    placeholder: bassImg,
  },
  { 
    id: 'drums', 
    label: 'Drums & Percussion', 
    sliceId: 'z7kTc', 
    preset: 'drum' as const,
    placeholder: drumsImg,
  },
  { 
    id: 'vocals', 
    label: 'Vocals', 
    sliceId: 'R7kTc', 
    preset: 'vocals' as const,
    placeholder: vocalsImg,
  },
];

const baseTips = [
  { icon: MousePointerClick, text: 'Drag on notation to loop any section' },
  { icon: Gauge, text: 'Slow down any passage without changing pitch' },
];

const fretboardTip = { icon: SlidersHorizontal, text: 'Press fretboard icon for animated fretboard' };
function getTipsForInstrument(id: string) {
  if (id === 'guitar' || id === 'bass') return [...baseTips, fretboardTip];
  return baseTips; // drums & vocals - no fretboard/piano tip
}

export default function Index() {
  const isMobile = useIsMobile();
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const trailerVideoRef = useRef<HTMLVideoElement>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<typeof instruments[0] | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    if (heroVideoRef.current) {
      heroVideoRef.current.play().catch(() => {});
    }
  }, []);

  const handleClosePopup = () => {
    setSelectedInstrument(null);
  };

  const handleCloseTrailer = () => {
    if (trailerVideoRef.current) {
      trailerVideoRef.current.pause();
      trailerVideoRef.current.currentTime = 0;
    }
    setShowTrailer(false);
  };

  return (
    <>
      <Helmet>
        <title>World Music Method | Master Your Instrument, Unlock Musical Freedom</title>
        <meta name="description" content="Accelerate your musical journey with world-class instructors, cutting-edge technology, and a vibrant global community. Access an entire world of musical knowledge." />
      </Helmet>
      
      <SiteHeader />
      <main className="min-h-screen bg-background">
        {/* Hero Section - Desktop: Split Layout */}
        <section className="relative w-full min-h-[85vh] hidden lg:flex items-stretch overflow-hidden">
          {/* Right side - Video */}
          <div className="absolute inset-0" style={{ left: '30%' }}>
            <video
              ref={heroVideoRef}
              src={HERO_VIDEO_URL}
              className="absolute inset-0 w-full h-full object-cover object-right"
              muted
              loop
              playsInline
              autoPlay
            />
            <div className="absolute inset-0 bg-black/30" />
            
            {/* Watch Trailer button centered on video area */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              onClick={() => setShowTrailer(true)}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 group cursor-pointer"
            >
              <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
              </div>
              <span className="text-sm font-semibold text-foreground bg-background/60 backdrop-blur-sm px-4 py-2 rounded-full">
                Watch Trailer
              </span>
            </motion.button>
          </div>

          {/* Left side - Text & CTAs with gradient overlay */}
          <div className="relative z-10 w-full lg:w-[50%] flex items-center">
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background from-65% to-transparent" />
            
            <div className="relative px-6 sm:px-10 lg:px-16 py-20 max-w-2xl">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl mb-6 text-foreground text-left"
              >
                Master Your Instrument, Unlock Musical Freedom
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed text-left"
              >
                Accelerate your journey with world-class instructors, cutting-edge technology, and a vibrant global community. Step beyond Western musical limitations, challenge yourself, and access an entire world of musical knowledge.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 items-start"
              >
                <Button
                  size="lg"
                  asChild
                  className="text-base px-8 py-6 h-auto"
                >
                  <a href="https://worldmusicmethod.lovable.app/membership">Start Your Free Trial</a>
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  asChild
                  className="text-base px-8 py-6 h-auto"
                >
                  <a href="https://worldmusicmethod.lovable.app/courses">View Courses</a>
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="mt-8 text-sm text-secondary"
              >
                Trusted by 2,500+ dedicated musicians worldwide
              </motion.p>
            </div>
          </div>
        </section>

        {/* Hero Section - Mobile: Stacked layout like course landing pages */}
        <section className="lg:hidden px-4 pt-6 pb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold mb-4 text-foreground"
          >
            Master Your Instrument, Unlock Musical Freedom
          </motion.h1>

          {/* Video thumbnail with play button */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative w-full aspect-video rounded-lg overflow-hidden cursor-pointer group mb-4 border-2 border-border"
            onClick={() => setShowTrailer(true)}
          >
            <video
              src={HERO_VIDEO_URL}
              className="w-full h-full object-cover"
              muted
              playsInline
              autoPlay
              loop
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 group-active:bg-black/40 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" />
              </div>
              <span className="mt-2 px-3 py-1 bg-black/60 rounded text-foreground text-xs font-medium">
                Watch Trailer
              </span>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm text-muted-foreground mb-5 leading-relaxed"
          >
            Accelerate your journey with world-class instructors, cutting-edge technology, and a vibrant global community.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col gap-3"
          >
            <Button size="lg" asChild className="text-base py-5 h-auto w-full">
              <a href="https://worldmusicmethod.lovable.app/membership">Start Your Free Trial</a>
            </Button>
            <Button variant="secondary" size="lg" asChild className="text-base py-5 h-auto w-full">
              <a href="https://worldmusicmethod.lovable.app/courses">View Courses</a>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-4 text-xs text-secondary text-center"
          >
            Trusted by 2,500+ dedicated musicians worldwide
          </motion.p>
        </section>

        {/* Partners Section */}
        <PartnersSection />

        {/* Instant Lesson Preview Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-4xl mb-4">
                Instant Lesson Preview
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
                Click any instrument below to experience a real lesson. Watch, listen, and interact with our cutting-edge practice technology.
              </p>
            </motion.div>

            {/* 2x2 Instrument Grid */}
            <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
               {instruments.map((inst, idx) => (
                  <motion.button
                    key={inst.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    onClick={() => setSelectedInstrument(inst)}
                    className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <img
                      src={inst.placeholder}
                      alt={inst.label}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                    
                    <div className="absolute bottom-0 left-0 right-0 z-10 p-3 md:p-4 bg-gradient-to-t from-black/70 to-transparent">
                      <span className="text-sm md:text-lg font-bold text-foreground">
                        {inst.label}
                      </span>
                    </div>
                  </motion.button>
                ))}
            </div>
          </div>
        </section>

        <StudentStoriesSection />

        {/* Bottom CTA Section */}
        <section className="py-16 md:py-24 border-t border-border/50">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-2xl md:text-4xl mb-8"
            >
              Ready to Explore the World Through Music?
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button size="lg" asChild className="text-base px-8 py-6 h-auto">
                <a href="https://worldmusicmethod.lovable.app/membership">Start Your Free Trial</a>
              </Button>
              <Button variant="secondary" size="lg" asChild className="text-base px-8 py-6 h-auto">
                <a href="https://worldmusicmethod.lovable.app/courses">View Courses</a>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Soundslice Popup Dialog - near-fullscreen on mobile */}
      <Dialog open={!!selectedInstrument} onOpenChange={(open) => !open && handleClosePopup()}>
        <DialogContent className={`${isMobile ? 'w-[100vw] h-[100dvh] max-w-none max-h-none rounded-none' : 'max-w-5xl w-[95vw]'} p-0 gap-0 bg-background border-border overflow-hidden [&>button:last-child]:hidden`}>
          <button
            onClick={handleClosePopup}
            className="absolute top-3 right-3 z-50 w-9 h-9 rounded-full bg-primary hover:bg-primary/80 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-primary-foreground" />
          </button>

          {/* Header with inline tips - hidden on mobile */}
          {!isMobile && (
            <div className="px-6 pt-5 pb-3 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {selectedInstrument?.label} Lesson Preview
              </h3>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
                {selectedInstrument && getTipsForInstrument(selectedInstrument.id).map((tip, idx) => {
                  const TipIcon = tip.icon;
                  return (
                    <div key={idx} className="flex items-center gap-1.5">
                      <TipIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
                      <span className="text-xs text-muted-foreground">{tip.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile: simple title bar */}
          {isMobile && (
            <div className="px-4 pt-4 pb-2">
              <h3 className="text-base font-semibold text-foreground">
                {selectedInstrument?.label} Lesson Preview
              </h3>
            </div>
          )}

          {/* Soundslice embed */}
          <div className={`${isMobile ? 'p-2 flex-1' : 'p-4'} overflow-y-auto`} style={{ maxHeight: isMobile ? undefined : 'calc(90vh - 80px)' }}>
            {selectedInstrument && (
              <SoundsliceEmbed
                sliceIdOrUrl={selectedInstrument.sliceId}
                preset={selectedInstrument.preset}
                height={isMobile ? window.innerHeight - 100 : 500}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Trailer Video Popup */}
      <Dialog open={showTrailer} onOpenChange={(open) => !open && handleCloseTrailer()}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 gap-0 bg-black border-border overflow-hidden [&>button:last-child]:hidden">
          <button
            onClick={handleCloseTrailer}
            className="absolute top-3 right-3 z-50 w-9 h-9 rounded-full bg-primary hover:bg-primary/80 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-primary-foreground" />
          </button>
          <video
            ref={trailerVideoRef}
            src={HERO_VIDEO_URL}
            className="w-full aspect-video"
            controls
            autoPlay
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
