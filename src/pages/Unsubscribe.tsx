import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { MailX, CheckCircle, XCircle, Loader2 } from 'lucide-react';

type UnsubscribeState = 'loading' | 'confirm' | 'success' | 'error' | 'resubscribed';

const UNSUBSCRIBE_REASONS = [
  { value: 'too_frequent', label: 'I receive too many emails' },
  { value: 'not_relevant', label: 'The content is not relevant to me' },
  { value: 'never_subscribed', label: "I never signed up for this list" },
  { value: 'other', label: 'Other reason' },
];

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [state, setState] = useState<UnsubscribeState>('loading');
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else if (email) {
      // Direct email unsubscribe (less secure but user-friendly)
      setVerifiedEmail(email);
      setState('confirm');
    } else {
      setState('error');
    }
  }, [token, email]);

  async function verifyToken() {
    try {
      const { data, error } = await supabase
        .from('email_unsubscribe_tokens')
        .select('*')
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data) {
        setState('error');
        return;
      }

      setVerifiedEmail(data.email);
      setState('confirm');
    } catch {
      setState('error');
    }
  }

  async function handleUnsubscribe() {
    if (!verifiedEmail) return;
    setProcessing(true);

    try {
      const reason = selectedReason === 'other' ? customReason : UNSUBSCRIBE_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;

      const { error } = await supabase.functions.invoke('handle-unsubscribe', {
        body: { 
          email: verifiedEmail, 
          token,
          reason,
          action: 'unsubscribe'
        }
      });

      if (error) throw error;
      setState('success');
      toast.success('You have been unsubscribed');
    } catch (err) {
      toast.error('Failed to unsubscribe. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleResubscribe() {
    if (!verifiedEmail) return;
    setProcessing(true);

    try {
      const { error } = await supabase.functions.invoke('handle-unsubscribe', {
        body: { 
          email: verifiedEmail, 
          action: 'resubscribe'
        }
      });

      if (error) throw error;
      setState('resubscribed');
      toast.success('You have been resubscribed');
    } catch (err) {
      toast.error('Failed to resubscribe. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Verifying...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid or Expired Link</CardTitle>
            <CardDescription>
              This unsubscribe link is invalid or has expired. Please contact support if you need help.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/">
              <Button variant="outline">Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Unsubscribed Successfully</CardTitle>
            <CardDescription>
              {verifiedEmail} has been removed from our mailing list. You will no longer receive marketing emails from us.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Changed your mind?
            </p>
            <Button variant="outline" onClick={handleResubscribe} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resubscribe
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'resubscribed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Resubscribed Successfully</CardTitle>
            <CardDescription>
              Welcome back! {verifiedEmail} will continue to receive our emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/">
              <Button>Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Confirm state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <MailX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle>Unsubscribe from Emails</CardTitle>
          <CardDescription>
            Are you sure you want to unsubscribe {verifiedEmail} from our mailing list?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Please tell us why (optional)</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {UNSUBSCRIBE_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="font-normal cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            
            {selectedReason === 'other' && (
              <Textarea
                placeholder="Please tell us your reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleUnsubscribe} 
              disabled={processing}
              variant="destructive"
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Unsubscribe
            </Button>
            <Link to="/" className="w-full">
              <Button variant="outline" className="w-full">
                Keep me subscribed
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
