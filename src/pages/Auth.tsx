import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [emailSent, setEmailSent] = useState(false);
  const { signIn, signUp } = useAuth();

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
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          toast.error(error.message);
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
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        const { error } = await signUp(email, password, fullName, firstName.trim(), lastName.trim());
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
          } else {
            toast.error(error.message);
          }
        } else {
          // Show email verification notice instead of redirecting
          setEmailSent(true);
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
          <div className="mx-auto mb-4">
            <img src={wmmLogo} alt="World Music Method" className="h-20 w-auto mx-auto" />
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
          {emailSent ? (
            <div className="space-y-6">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800 ml-2">
                  <strong>Check your email!</strong>
                </AlertDescription>
              </Alert>
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-secondary" />
                </div>
                <div className="space-y-2">
                  <p className="text-foreground font-medium">Verification email sent to:</p>
                  <p className="text-secondary font-semibold">{email}</p>
                </div>
                <p className="text-muted-foreground text-sm">
                  Please click the verification link in the email to activate your account. After verifying, come back here and sign in.
                </p>
                <div className="pt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder or
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEmailSent(false);
                      setPassword('');
                    }}
                    className="w-full"
                  >
                    Try again with a different email
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                  {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
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