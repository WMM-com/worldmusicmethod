import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGeoPricing, formatPrice } from '@/contexts/GeoPricingContext';
import { DigitalProduct } from '@/hooks/useDigitalProducts';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Wallet, Globe, Loader2, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentAccount {
  id: string;
  provider: 'stripe' | 'flutterwave' | 'paypal';
  account_id: string | null;
  onboarding_complete: boolean;
  account_email: string | null;
}

interface BuyProductModalProps {
  open: boolean;
  onClose: () => void;
  product: DigitalProduct;
  sellerId: string;
}

// African country codes for Flutterwave preference
const AFRICAN_COUNTRIES = [
  'NG', 'GH', 'KE', 'ZA', 'TZ', 'UG', 'RW', 'CM', 'CI', 'SN', 'ML', 'BF', 
  'NE', 'TG', 'BJ', 'GA', 'CD', 'CG', 'EG', 'MA', 'DZ', 'TN', 'LY', 'ET',
  'MZ', 'ZW', 'ZM', 'MW', 'BW', 'NA', 'SZ', 'LS', 'MU', 'SC', 'MG'
];

export function BuyProductModal({ open, onClose, product, sellerId }: BuyProductModalProps) {
  const { countryCode, calculatePrice, isLoading: geoLoading } = useGeoPricing();
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  // Load seller's payment accounts
  useEffect(() => {
    if (open && sellerId) {
      loadPaymentAccounts();
    }
  }, [open, sellerId]);

  // Auto-select best payment method based on buyer country
  useEffect(() => {
    if (paymentAccounts.length > 0 && countryCode && !selectedMethod) {
      const isAfrican = AFRICAN_COUNTRIES.includes(countryCode);
      const availableMethods = paymentAccounts.filter(a => a.onboarding_complete);
      
      if (isAfrican) {
        // Prefer Flutterwave for African countries
        const flutterwave = availableMethods.find(a => a.provider === 'flutterwave');
        if (flutterwave) {
          setSelectedMethod('flutterwave');
          return;
        }
      }
      
      // Otherwise prefer Stripe, then PayPal, then Flutterwave
      const stripe = availableMethods.find(a => a.provider === 'stripe');
      if (stripe) {
        setSelectedMethod('stripe');
        return;
      }
      
      const paypal = availableMethods.find(a => a.provider === 'paypal');
      if (paypal) {
        setSelectedMethod('paypal');
        return;
      }
      
      const flutterwave = availableMethods.find(a => a.provider === 'flutterwave');
      if (flutterwave) {
        setSelectedMethod('flutterwave');
      }
    }
  }, [paymentAccounts, countryCode, selectedMethod]);

  const loadPaymentAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_accounts')
        .select('id, provider, account_id, onboarding_complete, account_email')
        .eq('user_id', sellerId)
        .eq('onboarding_complete', true);

      if (error) throw error;
      setPaymentAccounts((data as PaymentAccount[]) || []);
    } catch (error) {
      console.error('Failed to load payment accounts:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  // Calculate geo-adjusted price
  const geoPrice = calculatePrice(product.base_price, product.geo_pricing ?
    Object.entries(product.geo_pricing).map(([region, data]: [string, any]) => ({
      region,
      discount_percentage: data.discount_percentage || 0,
      currency: data.currency || product.currency,
      fixed_price: data.fixed_price,
    })) : undefined
  );

  const displayPrice = geoPrice?.price ?? product.base_price;
  const displayCurrency = geoPrice?.currency ?? product.currency;
  const minPrice = product.min_price ?? 0;
  const suggestedPrice = displayPrice;

  // For PWYW, use custom amount or suggested price
  const finalAmount = product.price_type === 'pwyw'
    ? (customAmount ? parseFloat(customAmount) : suggestedPrice)
    : displayPrice;

  const handlePayNow = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if (product.price_type === 'pwyw' && finalAmount < minPrice) {
      toast.error(`Minimum price is ${formatPrice(minPrice, displayCurrency, false)}`);
      return;
    }

    setProcessing(true);

    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/payment-success?product=${product.id}`;
      const cancelUrl = `${origin}/profile/${sellerId}`;

      let response;

      switch (selectedMethod) {
        case 'stripe':
          response = await supabase.functions.invoke('create-digital-product-stripe-checkout', {
            body: {
              productId: product.id,
              sellerId,
              amount: finalAmount,
              currency: displayCurrency,
              successUrl,
              cancelUrl,
            },
          });
          break;

        case 'flutterwave':
          response = await supabase.functions.invoke('create-digital-product-flutterwave-payment', {
            body: {
              productId: product.id,
              sellerId,
              amount: finalAmount,
              currency: displayCurrency,
              redirectUrl: successUrl,
            },
          });
          break;

        case 'paypal':
          response = await supabase.functions.invoke('create-digital-product-paypal-order', {
            body: {
              productId: product.id,
              sellerId,
              amount: finalAmount,
              currency: displayCurrency,
              returnUrl: successUrl,
              cancelUrl,
            },
          });
          break;

        default:
          throw new Error('Invalid payment method');
      }

      if (response.error) {
        throw new Error(response.error.message || 'Payment failed');
      }

      const { url, approveUrl } = response.data;
      const redirectUrl = url || approveUrl;

      if (redirectUrl) {
        window.open(redirectUrl, '_blank');
        toast.success('Redirecting to payment...');
        onClose();
      } else {
        throw new Error('No payment URL returned');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'stripe':
        return <CreditCard className="h-5 w-5" />;
      case 'flutterwave':
        return <Globe className="h-5 w-5" />;
      case 'paypal':
        return <Wallet className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'stripe':
        return 'Credit/Debit Card';
      case 'flutterwave':
        return 'Flutterwave (Mobile Money / Cards)';
      case 'paypal':
        return 'PayPal';
      default:
        return provider;
    }
  };

  const availableAccounts = paymentAccounts.filter(a => a.onboarding_complete);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Buy {product.title}</DialogTitle>
          <DialogDescription>
            Choose your preferred payment method
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Price Display */}
          <div className="p-4 rounded-lg bg-muted">
            {product.price_type === 'pwyw' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pay What You Want</span>
                  {minPrice > 0 && (
                    <Badge variant="outline">
                      Min: {formatPrice(minPrice, displayCurrency, false)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{displayCurrency}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min={minPrice}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={suggestedPrice.toString()}
                    className="text-lg font-bold"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Suggested price: {formatPrice(suggestedPrice, displayCurrency, false)}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                {geoLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <span className="text-2xl font-bold">
                    {formatPrice(displayPrice, displayCurrency, false)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : availableAccounts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Seller has no payment methods configured</p>
              </div>
            ) : (
              <RadioGroup
                value={selectedMethod}
                onValueChange={setSelectedMethod}
                className="space-y-2"
              >
                {availableAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMethod === account.provider
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedMethod(account.provider)}
                  >
                    <RadioGroupItem value={account.provider} id={account.id} />
                    <div className="flex items-center gap-3 flex-1">
                      {getProviderIcon(account.provider)}
                      <div className="flex-1">
                        <p className="font-medium">{getProviderLabel(account.provider)}</p>
                        {AFRICAN_COUNTRIES.includes(countryCode) && account.provider === 'flutterwave' && (
                          <p className="text-xs text-green-600">Recommended for your region</p>
                        )}
                      </div>
                      {selectedMethod === account.provider && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Pay Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handlePayNow}
            disabled={processing || loading || availableAccounts.length === 0 || !selectedMethod}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay {formatPrice(finalAmount, displayCurrency, false)}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secure payment processed by {selectedMethod === 'stripe' ? 'Stripe' : selectedMethod === 'flutterwave' ? 'Flutterwave' : 'PayPal'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
