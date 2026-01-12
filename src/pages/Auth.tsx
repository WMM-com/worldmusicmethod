import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Mail, CheckCircle } from 'lucide-react';
import wmmLogo from '@/assets/world-music-method-logo.png';
import { HoneypotField, useHoneypotValidator } from '@/components/ui/honeypot-field';
import { usePersistentRateLimiter } from '@/hooks/useRateLimiter';
import { Turnstile, useTurnstileVerification } from '@/components/ui/turnstile';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

// Hook to get site logo from site_settings
function useSiteLogo() {
  return useQuery({
    queryKey: ['site-logo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'site_logo')
        .single();
      if (error || !data?.value) return null;
      return data.value;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') as 'login' | 'signup' | 'forgot' | null;
  const verified = searchParams.get('verified') === 'true';
  const unverified = searchParams.get('unverified') === 'true';
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(
    initialMode === 'signup' ? 'signup' : initialMode === 'forgot' ? 'forgot' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupNotice, setSignupNotice] = useState<{ email: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const { validateSubmission } = useHoneypotValidator();
  const rateLimiter = usePersistentRateLimiter({ maxAttempts: 5, windowMs: 60000, blockDurationMs: 300000 });
  const { verify: verifyTurnstile, isVerifying } = useTurnstileVerification();
  const { data: siteLogo } = useSiteLogo();

  useEffect(() => {
    if (verified) {
      toast.success('Email verified successfully! You can now log in.');
    }
    if (unverified) {
      toast.error('Please verify your email before logging in. Check your inbox for the verification link.');
    }
  }, [verified, unverified]);

  // Update mode when URL params change
  useEffect(() => {
    if (initialMode === 'signup') {
      setMode('signup');
    } else if (initialMode === 'forgot') {
      setMode('forgot');
    } else if (initialMode === 'login') {
      setMode('login');
    }
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limit
    const rateCheck = rateLimiter.checkRateLimit();
    if (!rateCheck.allowed) {
      toast.error(`Too many attempts. Please wait ${rateCheck.waitSeconds} seconds.`);
      return;
    }
    
    // Check honeypot (bot detection)
    const honeypotCheck = validateSubmission(formRef.current);
    if (honeypotCheck.isBot) {
      console.warn('Bot detected:', honeypotCheck.reason);
      // Silently fail for bots - don't give them feedback
      return;
    }
    
    // Verify Turnstile if configured and token available
    if (TURNSTILE_SITE_KEY && turnstileToken) {
      const isValid = await verifyTurnstile(turnstileToken);
      if (!isValid) {
        toast.error('Security verification failed. Please try again.');
        setLoading(false);
        return;
      }
    }
    
    // Record the attempt
    rateLimiter.recordAttempt();
    
    setLoading(true);

    try {
      if (mode === 'forgot') {
        // Use custom password reset function that sends from info@worldmusicmethod.com
        const { error: fnError } = await supabase.functions.invoke('send-password-reset', {
          body: { email, redirectTo: `${window.location.origin}/reset-password` }
        });
        if (fnError) {
          toast.error('Failed to send reset email. Please try again.');
        } else {
          toast.success('Password reset email sent! Check your inbox.');
          setMode('login');
        }
      } else if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        }
      } else {
        if (!firstName.trim() || !lastName.trim()) {
          toast.error('Please enter your first and last name');
          setLoading(false);
          return;
        }

        if (password.length < 8) {
          toast.error('Password must be at least 8 characters.');
          setLoading(false);
          return;
        }

        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        const { error } = await signUp(email, password, fullName, firstName.trim(), lastName.trim());
        if (error) {
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            toast.error('This email is already registered. Please sign in instead.');
          } else {
            toast.error(error.message);
          }
        } else {
          // Show email verification notice instead of redirecting
          setSignupNotice({ email: email.trim().toLowerCase() });
          setPassword('');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      </div>
      
      <Card className="relative w-full max-w-md glass">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-20 flex items-center justify-center">
            <img 
              src={siteLogo || wmmLogo} 
              alt="World Music Method" 
              className="h-20 w-auto mx-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold">
            World Music Method
          </CardTitle>
          <CardDescription>
            {mode === 'login' && 'Welcome back! Sign in to continue.'}
            {mode === 'signup' && 'Create your account to get started.'}
            {mode === 'forgot' && 'Enter your email to reset your password.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signupNotice ? (
            <div className="space-y-6">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800 ml-2">
                  <strong>Verify your email</strong>
                </AlertDescription>
              </Alert>
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-secondary" />
                </div>
                <div className="space-y-2">
                  <p className="text-foreground font-medium">We sent a verification email to:</p>
                  <p className="text-secondary font-semibold">{signupNotice.email}</p>
                </div>
                <p className="text-muted-foreground text-sm">
                  Click the link in that email to verify your account. After verifying, come back here and sign in.
                </p>
                <div className="pt-4 space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSignupNotice(null);
                      setPassword('');
                    }}
                    className="w-full"
                  >
                    Use a different email
                  </Button>
                  <Button
                    onClick={() => {
                      setSignupNotice(null);
                      setMode('login');
                      setPassword('');
                    }}
                    className="w-full gradient-primary"
                  >
                    Back to login
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <HoneypotField />
                {mode === 'signup' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {mode !== 'forgot' && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                )}
                {/* Turnstile widget */}
                {TURNSTILE_SITE_KEY && (
                  <div className="flex justify-center">
                    <Turnstile
                      siteKey={TURNSTILE_SITE_KEY}
                      onVerify={setTurnstileToken}
                      theme="auto"
                      size="normal"
                    />
                  </div>
                )}
                <Button type="submit" className="w-full gradient-primary" disabled={loading || isVerifying || (TURNSTILE_SITE_KEY && !turnstileToken)}>
                  {loading || isVerifying ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
                </Button>
              </form>
              
              {mode === 'login' && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-sm text-muted-foreground hover:text-secondary"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
              
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">
                  {mode === 'login' ? "Don't have an account? " : mode === 'signup' ? 'Already have an account? ' : 'Remember your password? '}
                </span>
                <button
                  type="button"
                  onClick={() => setMode(mode === 'signup' ? 'login' : mode === 'forgot' ? 'login' : 'signup')}
                  className="font-medium text-secondary hover:underline"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}