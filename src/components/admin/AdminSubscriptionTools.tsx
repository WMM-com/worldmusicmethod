import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Search, CreditCard, RefreshCw } from 'lucide-react';

export function AdminSubscriptionTools() {
  const [recoverEmail, setRecoverEmail] = useState('');
  const [chargeEmail, setChargeEmail] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [chargeLoading, setChargeLoading] = useState(false);
  const [recoverResult, setRecoverResult] = useState<any>(null);
  const [chargeResult, setChargeResult] = useState<any>(null);

  const recoverPayPalSales = async () => {
    if (!recoverEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    setRecoverLoading(true);
    setRecoverResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('recover-paypal-sales', {
        body: { email: recoverEmail.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRecoverResult(data);
      toast.success(`Recovered ${data.recovered} sales records`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to recover sales');
    } finally {
      setRecoverLoading(false);
    }
  };

  const chargeSubscription = async () => {
    if (!chargeEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    setChargeLoading(true);
    setChargeResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('manual-charge-subscription', {
        body: { email: chargeEmail.trim(), action: 'charge_now' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setChargeResult(data);
      toast.success(`Charged ${data.charged} ${data.currency} successfully`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to charge subscription');
    } finally {
      setChargeLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Recover Missing PayPal Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Recover Missing PayPal Sales
          </CardTitle>
          <CardDescription>
            Find PayPal subscriptions without matching order records and create them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="User email address"
              value={recoverEmail}
              onChange={(e) => setRecoverEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && recoverPayPalSales()}
            />
            <Button onClick={recoverPayPalSales} disabled={recoverLoading}>
              {recoverLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Recover</span>
            </Button>
          </div>
          {recoverResult && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><strong>User ID:</strong> {recoverResult.userId}</p>
              <p><strong>Recovered:</strong> {recoverResult.recovered} order(s)</p>
              {recoverResult.details?.map((d: string, i: number) => (
                <p key={i} className="text-muted-foreground">{d}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Subscription Charge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Manual Subscription Charge
          </CardTitle>
          <CardDescription>
            Immediately charge a user's active Stripe subscription and update their billing date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="User email address"
              value={chargeEmail}
              onChange={(e) => setChargeEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && chargeSubscription()}
            />
            <Button onClick={chargeSubscription} disabled={chargeLoading} variant="destructive">
              {chargeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              <span className="ml-2">Charge Now</span>
            </Button>
          </div>
          {chargeResult && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><strong>Charged:</strong> {chargeResult.charged} {chargeResult.currency}</p>
              <p><strong>Next billing:</strong> {new Date(chargeResult.nextBilling).toLocaleDateString()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
