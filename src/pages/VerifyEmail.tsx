import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import wmmLogo from '@/assets/world-music-method-logo.png';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    verifyToken(token);
  }, [searchParams]);

  const verifyToken = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-email', {
        body: { token }
      });

      if (error || !data?.success) {
        setStatus('error');
        setMessage(data?.error || error?.message || 'Verification failed');
        return;
      }

      setStatus('success');
      setMessage('Your email has been verified successfully!');

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/auth?mode=login&verified=true');
      }, 3000);
    } catch (err) {
      console.error('Verification error:', err);
      setStatus('error');
      setMessage('An unexpected error occurred');
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
            Email Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === 'loading' && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-secondary animate-spin" />
              </div>
              <p className="text-muted-foreground">Verifying your email...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <p className="text-foreground font-medium">{message}</p>
                <p className="text-muted-foreground text-sm">
                  Redirecting you to login...
                </p>
              </div>
              <Button 
                onClick={() => navigate('/auth?mode=login&verified=true')}
                className="w-full gradient-primary"
              >
                Continue to Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="space-y-2">
                <p className="text-foreground font-medium">Verification Failed</p>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/auth?mode=signup')}
                  className="w-full gradient-primary"
                >
                  Try Signing Up Again
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/auth?mode=login')}
                  className="w-full"
                >
                  Go to Login
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
