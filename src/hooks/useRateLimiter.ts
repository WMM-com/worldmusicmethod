import { useState, useCallback, useRef } from 'react';

interface RateLimiterOptions {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
  blockDurationMs: number; // How long to block after max attempts
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
  maxAttempts: 5,
  windowMs: 60000, // 1 minute
  blockDurationMs: 300000, // 5 minutes
};

/**
 * Client-side rate limiter for authentication attempts
 * Helps prevent brute force attacks by blocking rapid attempts
 */
export function useRateLimiter(options: Partial<RateLimiterOptions> = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const attemptsRef = useRef<number[]>([]);
  const blockedUntilRef = useRef<number | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const checkRateLimit = useCallback((): { allowed: boolean; waitSeconds?: number } => {
    const now = Date.now();

    // Check if currently blocked
    if (blockedUntilRef.current && now < blockedUntilRef.current) {
      const waitSeconds = Math.ceil((blockedUntilRef.current - now) / 1000);
      setRemainingTime(waitSeconds);
      setIsBlocked(true);
      return { allowed: false, waitSeconds };
    }

    // Clear block if time passed
    if (blockedUntilRef.current && now >= blockedUntilRef.current) {
      blockedUntilRef.current = null;
      attemptsRef.current = [];
      setIsBlocked(false);
      setRemainingTime(0);
    }

    // Clean old attempts outside the window
    attemptsRef.current = attemptsRef.current.filter(
      time => now - time < opts.windowMs
    );

    // Check if too many attempts
    if (attemptsRef.current.length >= opts.maxAttempts) {
      blockedUntilRef.current = now + opts.blockDurationMs;
      const waitSeconds = Math.ceil(opts.blockDurationMs / 1000);
      setRemainingTime(waitSeconds);
      setIsBlocked(true);
      return { allowed: false, waitSeconds };
    }

    return { allowed: true };
  }, [opts.windowMs, opts.maxAttempts, opts.blockDurationMs]);

  const recordAttempt = useCallback(() => {
    attemptsRef.current.push(Date.now());
  }, []);

  const reset = useCallback(() => {
    attemptsRef.current = [];
    blockedUntilRef.current = null;
    setIsBlocked(false);
    setRemainingTime(0);
  }, []);

  return {
    checkRateLimit,
    recordAttempt,
    reset,
    isBlocked,
    remainingTime,
  };
}

// Storage key for persistent rate limiting across page refreshes
const STORAGE_KEY = 'auth_rate_limit';

interface StoredRateLimit {
  attempts: number[];
  blockedUntil: number | null;
}

/**
 * Persistent rate limiter that survives page refreshes
 * Uses localStorage to track attempts
 */
export function usePersistentRateLimiter(options: Partial<RateLimiterOptions> = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const getStoredData = useCallback((): StoredRateLimit => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parsing errors
    }
    return { attempts: [], blockedUntil: null };
  }, []);

  const setStoredData = useCallback((data: StoredRateLimit) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const checkRateLimit = useCallback((): { allowed: boolean; waitSeconds?: number } => {
    const now = Date.now();
    const data = getStoredData();

    // Check if currently blocked
    if (data.blockedUntil && now < data.blockedUntil) {
      const waitSeconds = Math.ceil((data.blockedUntil - now) / 1000);
      return { allowed: false, waitSeconds };
    }

    // Clear block if time passed
    if (data.blockedUntil && now >= data.blockedUntil) {
      setStoredData({ attempts: [], blockedUntil: null });
      return { allowed: true };
    }

    // Clean old attempts outside the window
    const validAttempts = data.attempts.filter(time => now - time < opts.windowMs);

    // Check if too many attempts
    if (validAttempts.length >= opts.maxAttempts) {
      const blockedUntil = now + opts.blockDurationMs;
      setStoredData({ attempts: validAttempts, blockedUntil });
      const waitSeconds = Math.ceil(opts.blockDurationMs / 1000);
      return { allowed: false, waitSeconds };
    }

    return { allowed: true };
  }, [getStoredData, setStoredData, opts.windowMs, opts.maxAttempts, opts.blockDurationMs]);

  const recordAttempt = useCallback(() => {
    const now = Date.now();
    const data = getStoredData();
    const validAttempts = data.attempts.filter(time => now - time < opts.windowMs);
    validAttempts.push(now);
    setStoredData({ ...data, attempts: validAttempts });
  }, [getStoredData, setStoredData, opts.windowMs]);

  const reset = useCallback(() => {
    setStoredData({ attempts: [], blockedUntil: null });
  }, [setStoredData]);

  const getStatus = useCallback(() => {
    const now = Date.now();
    const data = getStoredData();
    
    if (data.blockedUntil && now < data.blockedUntil) {
      return {
        isBlocked: true,
        remainingTime: Math.ceil((data.blockedUntil - now) / 1000),
        attempts: data.attempts.length,
      };
    }
    
    const validAttempts = data.attempts.filter(time => now - time < opts.windowMs);
    return {
      isBlocked: false,
      remainingTime: 0,
      attempts: validAttempts.length,
    };
  }, [getStoredData, opts.windowMs]);

  return {
    checkRateLimit,
    recordAttempt,
    reset,
    getStatus,
  };
}
