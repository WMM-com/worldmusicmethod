import { useState, useEffect } from 'react';

interface HoneypotFieldProps {
  /** Field name for the hidden input - use something tempting to bots */
  fieldName?: string;
  /** Callback when honeypot is triggered (bot detected) */
  onBotDetected?: () => void;
}

/**
 * Honeypot field component for spam protection
 * 
 * Renders an invisible input field that legitimate users won't see or fill,
 * but bots will automatically fill. If filled, it indicates a bot submission.
 * 
 * Also includes timing check - submissions faster than 2 seconds are suspicious
 */
export function HoneypotField({ 
  fieldName = 'website_url',
  onBotDetected 
}: HoneypotFieldProps) {
  const [loadTime] = useState(() => Date.now());

  return (
    <>
      {/* Hidden field that bots will fill */}
      <div 
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          opacity: 0,
          height: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
        tabIndex={-1}
      >
        <label htmlFor={fieldName}>
          Leave this field empty
        </label>
        <input
          type="text"
          id={fieldName}
          name={fieldName}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>
      
      {/* Hidden timestamp field to check submission speed */}
      <input
        type="hidden"
        name="_form_load_time"
        value={loadTime.toString()}
      />
    </>
  );
}

/**
 * Hook to validate honeypot fields
 * Returns true if submission appears to be from a bot
 */
export function useHoneypotValidator() {
  const validateSubmission = (formElement?: HTMLFormElement | null): { isBot: boolean; reason?: string } => {
    if (!formElement) {
      return { isBot: false };
    }

    // Check honeypot field
    const honeypotFields = ['website_url', 'url', 'phone2', 'fax'];
    for (const fieldName of honeypotFields) {
      const field = formElement.querySelector<HTMLInputElement>(`[name="${fieldName}"]`);
      if (field && field.value) {
        console.warn('Honeypot triggered:', fieldName);
        return { isBot: true, reason: 'honeypot' };
      }
    }

    // Check submission timing
    const loadTimeField = formElement.querySelector<HTMLInputElement>('[name="_form_load_time"]');
    if (loadTimeField) {
      const loadTime = parseInt(loadTimeField.value, 10);
      const submissionTime = Date.now();
      const timeDiff = submissionTime - loadTime;
      
      // Submissions faster than 2 seconds are suspicious
      if (timeDiff < 2000) {
        console.warn('Suspicious fast submission:', timeDiff, 'ms');
        return { isBot: true, reason: 'too_fast' };
      }
    }

    return { isBot: false };
  };

  return { validateSubmission };
}

/**
 * Simple hook to track form load time
 * Useful for forms that don't use the HoneypotField component
 */
export function useFormTiming() {
  const [loadTime] = useState(() => Date.now());

  const checkSubmissionSpeed = (): boolean => {
    const timeDiff = Date.now() - loadTime;
    // Return true if submission is too fast (likely bot)
    return timeDiff < 2000;
  };

  return {
    loadTime,
    checkSubmissionSpeed,
    getElapsedTime: () => Date.now() - loadTime,
  };
}
