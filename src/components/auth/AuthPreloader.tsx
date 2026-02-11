import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthPreloaderProps {
  onComplete: () => void;
}

export function AuthPreloader({ onComplete }: AuthPreloaderProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 600),   // Show "Welcome"
      setTimeout(() => setStep(2), 2200),   // Fade out, then show line 2
      setTimeout(() => setStep(3), 4000),   // Fade out, then show line 3
      setTimeout(() => setStep(4), 5800),   // Fade out everything
      setTimeout(() => onComplete(), 6600), // Done
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {step < 4 && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <div className="max-w-lg px-6 text-center">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.h1
                  key="welcome"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="text-4xl md:text-5xl font-bold text-white tracking-tight"
                >
                  Welcome
                </motion.h1>
              )}
              {step === 2 && (
                <motion.p
                  key="new-version"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="text-xl md:text-2xl text-white font-medium leading-relaxed"
                >
                  This is a brand new version of the platform.
                </motion.p>
              )}
              {step === 3 && (
                <motion.p
                  key="request-password"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="text-xl md:text-2xl font-medium leading-relaxed"
                  style={{ color: '#FACC15' }}
                >
                  Request a new password to gain access.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
