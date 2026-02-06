import { useState, useRef, useEffect } from 'react';
// Home page
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Play, 
  X, 
  Guitar,
  Drum,
  Mic,
  Music,
  Repeat,
  Timer,
  MousePointerClick,
  SlidersHorizontal,
  Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SoundsliceEmbed } from '@/components/courses/SoundsliceEmbed';
import { useIsMobile } from '@/hooks/use-mobile';

const HERO_VIDEO_URL = 'https://pub-cbdecee3a4d44866a8523b54ebfd19f8.r2.dev/2026/02/Funnel-Trailer-YT-FINAL-2.mp4';

const instruments = [
  { 
    id: 'guitar', 
    label: 'Guitar', 
    sliceId: 'M7kTc', 
    preset: 'guitar' as const,
    icon: Guitar,
    placeholder: '/placeholder.svg',
  },
  { 
    id: 'bass', 
    label: 'Bass', 
    sliceId: 'w7kTc', 
    preset: 'bass' as const,
    icon: Music,
    placeholder: '/placeholder.svg',
  },
  { 
    id: 'drums', 
    label: 'Drums & Percussion', 
    sliceId: 'z7kTc', 
    preset: 'drum' as const,
    icon: Drum,
    placeholder: '/placeholder.svg',
  },
  { 
    id: 'vocals', 
    label: 'Vocals', 
    sliceId: 'R7kTc', 
    preset: 'vocals' as const,
    icon: Mic,
    placeholder: '/placeholder.svg',
  },
];

const soundsliceTips = [
  { icon: MousePointerClick, title: 'Click & Drag to Loop', description: 'Select any bars on the notation to instantly loop them' },
  { icon: Gauge, title: 'Adjust Tempo', description: 'Slow down or speed up any passage with the tempo controls' },
  { icon: SlidersHorizontal, title: 'Fretboard View', description: 'Press the fretboard icon to see notes on an animated fretboard (guitar & bass)' },
  { icon: Repeat, title: 'Auto-Repeat', description: 'Loop difficult sections until you nail them perfectly' },
  { icon: Timer, title: 'Measure Counter', description: 'Track exactly where you are in the piece at all times' },
];

export default function Index() {
  const isMobile = useIsMobile();
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<typeof instruments[0] | null>(null);

  // Autoplay hero video muted
  useEffect(() => {
    if (heroVideoRef.current) {
      heroVideoRef.current.play().catch(() => {});
    }
  }, []);

  const handleClosePopup = () => {
    setSelectedInstrument(null);
  };

  return (
    <>
      <Helmet>
        <title>World Music Method | Master Your Instrument, Unlock Musical Freedom</title>
        <meta name="description" content="Accelerate your musical journey with world-class instructors, cutting-edge technology, and a vibrant global community. Access an entire world of musical knowledge." />
      </Helmet>
      <SiteHeader />
      
      <main className="min-h-screen bg-background">
        {/* ── Hero Section ── */}
        <section className="relative w-full overflow-hidden min-h-[90vh] flex items-center">
          {/* Background video */}
          <video
            ref={heroVideoRef}
            src={HERO_VIDEO_URL}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            loop
            playsInline
            autoPlay
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-black/60" />
          <div 
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 40%)' }}
          />

          <div className="relative z-10 max-w-5xl mx-auto px-4 py-20 md:py-32 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-6 text-foreground"
            >
              Master Your Instrument, Unlock Musical Freedom
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              Accelerate your journey with world-class instructors, cutting-edge technology, and a vibrant global community. Step beyond Western musical limitations, challenge yourself, and access an entire world of musical knowledge.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
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
          </div>
        </section>

        {/* ── Instant Lesson Preview Section ── */}
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
            <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto mb-14">
              {instruments.map((inst, idx) => {
                const Icon = inst.icon;
                return (
                  <motion.button
                    key={inst.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    onClick={() => setSelectedInstrument(inst)}
                    className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {/* Placeholder image */}
                    <img
                      src={inst.placeholder}
                      alt={inst.label}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors" />
                    
                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center justify-center h-full gap-3">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Play className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground ml-0.5" fill="currentColor" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-foreground/80" />
                        <span className="text-sm md:text-base font-semibold text-foreground">
                          {inst.label}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Soundslice Quick Tips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl mx-auto"
            >
              <h3 className="text-lg md:text-xl font-semibold text-center mb-6">
                How to Use the Practice Player
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {soundsliceTips.map((tip, idx) => {
                  const TipIcon = tip.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border"
                    >
                      <TipIcon className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── Soundslice Popup Dialog ── */}
      <Dialog open={!!selectedInstrument} onOpenChange={(open) => !open && handleClosePopup()}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 gap-0 bg-background border-border overflow-hidden">
          {/* Close button */}
          <button
            onClick={handleClosePopup}
            className="absolute top-3 right-3 z-50 w-9 h-9 rounded-full bg-primary hover:bg-primary/80 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-primary-foreground" />
          </button>

          {/* Header */}
          <div className="px-6 pt-5 pb-3 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              {selectedInstrument?.label} — Lesson Preview
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try the interactive player below. Click and drag on the notation to loop sections, adjust tempo, and explore.
            </p>
          </div>

          {/* Soundslice embed */}
          <div className="p-4">
            {selectedInstrument && (
              <SoundsliceEmbed
                sliceIdOrUrl={selectedInstrument.sliceId}
                preset={selectedInstrument.preset}
                height={isMobile ? 400 : 550}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
