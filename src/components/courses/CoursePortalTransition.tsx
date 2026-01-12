import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface CoursePortalTransitionProps {
  children: React.ReactNode;
  courseId: string;
  imageUrl?: string;
}

export function CoursePortalTransition({ children, courseId, imageUrl }: CoursePortalTransitionProps) {
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'tilt-left' | 'tilt-right' | 'zoom' | 'fade'>('idle');
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (cardRef.current) {
      setCardRect(cardRef.current.getBoundingClientRect());
    }
    
    setIsTransitioning(true);
    setTransitionPhase('tilt-left');

    // Phase sequence: tilt left → tilt right → zoom forward → navigate
    setTimeout(() => setTransitionPhase('tilt-right'), 150);
    setTimeout(() => setTransitionPhase('zoom'), 350);
    setTimeout(() => {
      setTransitionPhase('fade');
      // Store transition state for the landing page
      sessionStorage.setItem('coursePortalTransition', JSON.stringify({
        courseId,
        imageUrl,
        timestamp: Date.now()
      }));
      navigate(`/courses/${courseId}`);
    }, 900);
  };

  return (
    <>
      <div 
        ref={cardRef} 
        onClick={handleClick}
        className="cursor-pointer"
        style={{ perspective: '1000px' }}
      >
        <motion.div
          animate={{
            rotateY: transitionPhase === 'tilt-left' ? -8 : transitionPhase === 'tilt-right' ? 8 : 0,
            rotateX: transitionPhase === 'zoom' ? -5 : 0,
            scale: transitionPhase === 'zoom' ? 1.05 : 1,
            opacity: transitionPhase === 'fade' ? 0 : 1,
          }}
          transition={{
            rotateY: { duration: 0.15, ease: 'easeOut' },
            rotateX: { duration: 0.2, ease: 'easeOut' },
            scale: { duration: 0.3, ease: 'easeOut' },
            opacity: { duration: 0.15 }
          }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {children}
        </motion.div>
      </div>

      {/* Full-screen portal transition overlay */}
      <AnimatePresence>
        {isTransitioning && transitionPhase === 'zoom' && imageUrl && cardRect && (
          <motion.div
            className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Radial blur / tunnel effect */}
            <motion.div
              className="absolute inset-0 bg-background"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            />
            
            {/* Flying image that zooms to fill screen */}
            <motion.div
              className="absolute overflow-hidden rounded-2xl"
              initial={{
                left: cardRect.left,
                top: cardRect.top,
                width: cardRect.width,
                height: cardRect.height,
              }}
              animate={{
                left: 0,
                top: 0,
                width: '100vw',
                height: '100vh',
                borderRadius: 0,
              }}
              transition={{
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1], // Expo ease out for dramatic effect
              }}
            >
              <motion.img
                src={imageUrl}
                alt=""
                className="w-full h-full object-cover"
                initial={{ scale: 1 }}
                animate={{ scale: 1.2 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
              
              {/* Vignette overlay for tunnel effect */}
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                style={{
                  background: 'radial-gradient(circle at center, transparent 20%, hsl(var(--background)) 100%)'
                }}
              />
            </motion.div>

            {/* Speed lines / motion blur effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              style={{
                background: `repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 2px,
                  hsl(var(--primary) / 0.1) 2px,
                  hsl(var(--primary) / 0.1) 4px
                )`
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Hook to detect if we came from a portal transition
export function usePortalTransitionEntry() {
  const [isFromPortal, setIsFromPortal] = useState(false);
  const [portalData, setPortalData] = useState<{ courseId: string; imageUrl?: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('coursePortalTransition');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Only use if transition was within last 2 seconds
        if (Date.now() - data.timestamp < 2000) {
          setIsFromPortal(true);
          setPortalData(data);
        }
      } catch {
        // Invalid data, ignore
      }
      sessionStorage.removeItem('coursePortalTransition');
    }
  }, []);

  return { isFromPortal, portalData };
}
