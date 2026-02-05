import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  usePaymentAccounts, 
  useConnectStripe, 
  useConnectFlutterwave, 
  useConnectPaypal,
  useDisconnectPaymentAccount 
} from '@/hooks/usePaymentAccounts';
import { 
  CreditCard, 
  Check, 
  Loader2, 
  ExternalLink,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Icons for providers
const PROVIDER_CONFIG = {
  stripe: {
    name: 'Stripe',
    description: 'Accept card payments globally',
    color: 'bg-purple-500/10 text-purple-600',
  },
  flutterwave: {
    name: 'Flutterwave',
    description: 'Accept payments in Africa',
    color: 'bg-orange-500/10 text-orange-600',
  },
  paypal: {
    name: 'PayPal',
    description: 'Accept PayPal payments',
    color: 'bg-blue-500/10 text-blue-600',
  },
};

export function PaymentAccountsSettings() {
  const { data: accounts, isLoading } = usePaymentAccounts();
  const connectStripe = useConnectStripe();
  const connectFlutterwave = useConnectFlutterwave();
  const connectPaypal = useConnectPaypal();
  const disconnectAccount = useDisconnectPaymentAccount();

  const [paypalEmail, setPaypalEmail] = useState('');
  const [paypalDialogOpen, setPaypalDialogOpen] = useState(false);
  const [flutterwaveDialogOpen, setFlutterwaveDialogOpen] = useState(false);
  const [flutterwaveForm, setFlutterwaveForm] = useState({
    business_name: '',
    business_email: '',
    bank_code: '',
    account_number: '',
    country: 'NG',
  });

  const getAccount = (provider: string) => accounts?.find(a => a.provider === provider);

  const handleConnectPaypal = async () => {
    if (!paypalEmail || !paypalEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    await connectPaypal.mutateAsync(paypalEmail);
    setPaypalDialogOpen(false);
    setPaypalEmail('');
  };

  const handleConnectFlutterwave = async () => {
    if (!flutterwaveForm.business_name || !flutterwaveForm.business_email) {
      toast.error('Please fill in all required fields');
      return;
    }
    await connectFlutterwave.mutateAsync(flutterwaveForm);
    setFlutterwaveDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Accounts
        </CardTitle>
        <CardDescription>
          Connect payment providers to receive money directly from your sales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stripe */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${PROVIDER_CONFIG.stripe.color}`}>
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{PROVIDER_CONFIG.stripe.name}</p>
              <p className="text-sm text-muted-foreground">{PROVIDER_CONFIG.stripe.description}</p>
            </div>
          </div>
          {getAccount('stripe')?.onboarding_complete ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Check className="h-3 w-3 mr-1" /> Connected
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => disconnectAccount.mutate(getAccount('stripe')!.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : getAccount('stripe') ? (
            <Badge variant="outline" className="text-muted-foreground">
              <AlertCircle className="h-3 w-3 mr-1" /> Pending
            </Badge>
          ) : (
            <Button
              variant="outline"
              onClick={() => connectStripe.mutate()}
              disabled={connectStripe.isPending}
            >
              {connectStripe.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Connect <ExternalLink className="h-3 w-3 ml-1" /></>
              )}
            </Button>
          )}
        </div>

        {/* Flutterwave */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${PROVIDER_CONFIG.flutterwave.color}`}>
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{PROVIDER_CONFIG.flutterwave.name}</p>
              <p className="text-sm text-muted-foreground">{PROVIDER_CONFIG.flutterwave.description}</p>
            </div>
          </div>
          {getAccount('flutterwave')?.onboarding_complete ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Check className="h-3 w-3 mr-1" /> Connected
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => disconnectAccount.mutate(getAccount('flutterwave')!.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Dialog open={flutterwaveDialogOpen} onOpenChange={setFlutterwaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Connect</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect Flutterwave</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Business Name</Label>
                    <Input
                      value={flutterwaveForm.business_name}
                      onChange={(e) => setFlutterwaveForm(prev => ({ ...prev, business_name: e.target.value }))}
                      placeholder="Your business name"
                    />
                  </div>
                  <div>
                    <Label>Business Email</Label>
                    <Input
                      type="email"
                      value={flutterwaveForm.business_email}
                      onChange={(e) => setFlutterwaveForm(prev => ({ ...prev, business_email: e.target.value }))}
                      placeholder="business@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Bank Code</Label>
                      <Input
                        value={flutterwaveForm.bank_code}
                        onChange={(e) => setFlutterwaveForm(prev => ({ ...prev, bank_code: e.target.value }))}
                        placeholder="e.g., 044"
                      />
                    </div>
                    <div>
                      <Label>Account Number</Label>
                      <Input
                        value={flutterwaveForm.account_number}
                        onChange={(e) => setFlutterwaveForm(prev => ({ ...prev, account_number: e.target.value }))}
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleConnectFlutterwave}
                    disabled={connectFlutterwave.isPending}
                    className="w-full"
                  >
                    {connectFlutterwave.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Connect Flutterwave'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* PayPal */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${PROVIDER_CONFIG.paypal.color}`}>
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{PROVIDER_CONFIG.paypal.name}</p>
              <p className="text-sm text-muted-foreground">{PROVIDER_CONFIG.paypal.description}</p>
            </div>
          </div>
          {getAccount('paypal')?.onboarding_complete ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Check className="h-3 w-3 mr-1" /> {getAccount('paypal')?.account_email}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => disconnectAccount.mutate(getAccount('paypal')!.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Dialog open={paypalDialogOpen} onOpenChange={setPaypalDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Connect</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect PayPal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>PayPal Email Address</Label>
                    <Input
                      type="email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This email must match your PayPal account
                    </p>
                  </div>
                  <Button 
                    onClick={handleConnectPaypal}
                    disabled={connectPaypal.isPending}
                    className="w-full"
                  >
                    {connectPaypal.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Connect PayPal'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
