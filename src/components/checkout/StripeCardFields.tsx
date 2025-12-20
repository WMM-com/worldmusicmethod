import { useState, useEffect } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Simple, hardcoded styles that Stripe Elements definitely accepts
const CARD_ELEMENT_STYLE = {
  base: {
    fontSize: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1a1a1a',
    '::placeholder': {
      color: '#6b7280',
    },
  },
  invalid: {
    color: '#dc2626',
  },
};

interface StripeCardFieldsProps {
  productId: string;
  email: string;
  fullName: string;
  password: string;
  couponCode?: string;
  amount: number;
  onSuccess: () => void;
  debugEnabled?: boolean;
}

export function StripeCardFields({
  productId,
  email,
  fullName,
  password,
  couponCode,
  amount,
  onSuccess,
  debugEnabled = false,
}: StripeCardFieldsProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debug state
  const [mounted, setMounted] = useState({ number: false, expiry: false, cvc: false });

  // Create payment intent on mount
  useEffect(() => {
    if (!productId) return;

    let cancelled = false;

    (async () => {
      try {
        console.log('[StripeCardFields] Creating payment intent for product:', productId);
        const { data, error: invokeError } = await supabase.functions.invoke('create-payment-intent', {
          body: {
            productId,
            email: email || 'guest@checkout.com',
            fullName: fullName || 'Guest',
            couponCode,
          },
        });

        if (invokeError) throw invokeError;
        if (!cancelled && data?.clientSecret) {
          console.log('[StripeCardFields] Got client secret');
          setClientSecret(data.clientSecret);
        }
      } catch (err: any) {
        console.error('[StripeCardFields] Payment intent error:', err);
        if (!cancelled) setError(err.message || 'Failed to initialize payment');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, couponCode, email, fullName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      toast.error('Payment system not ready. Please wait a moment and try again.');
      return;
    }

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        throw new Error('Card input not found. Please refresh and try again.');
      }

      console.log('[StripeCardFields] Confirming card payment...');
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: fullName || email,
            email,
          },
        },
      });

      if (paymentError) {
        throw new Error(paymentError.message || 'Payment failed');
      }

      if (paymentIntent?.status === 'succeeded') {
        console.log('[StripeCardFields] Payment succeeded, completing...');
        const { error: completeError } = await supabase.functions.invoke('complete-stripe-payment', {
          body: { paymentIntentId: paymentIntent.id, password },
        });

        if (completeError) throw completeError;

        toast.success('Payment successful!');
        onSuccess();
      }
    } catch (err: any) {
      console.error('[StripeCardFields] Payment error:', err);
      setError(err.message);
      toast.error(err.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (amt: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amt);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Debug panel */}
      {debugEnabled && (
        <div className="rounded border border-gray-300 bg-gray-50 p-3 text-xs font-mono">
          <div className="space-y-1">
            <div>stripe: {stripe ? '✓ ready' : '✗ not ready'}</div>
            <div>elements: {elements ? '✓ ready' : '✗ not ready'}</div>
            <div>clientSecret: {clientSecret ? '✓ set' : '✗ not set'}</div>
            <div>number mounted: {mounted.number ? '✓' : '✗'}</div>
            <div>expiry mounted: {mounted.expiry ? '✓' : '✗'}</div>
            <div>cvc mounted: {mounted.cvc ? '✓' : '✗'}</div>
          </div>
        </div>
      )}

      {/* Card Number */}
      <div className="space-y-2">
        <Label htmlFor="card-number">Card number</Label>
        <div
          id="card-number"
          className="min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-3"
        >
          <CardNumberElement
            options={{ style: CARD_ELEMENT_STYLE }}
            onReady={() => {
              console.log('[StripeCardFields] CardNumberElement ready');
              setMounted((prev) => ({ ...prev, number: true }));
            }}
          />
        </div>
      </div>

      {/* Expiry & CVC */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="card-expiry">Expiry</Label>
          <div
            id="card-expiry"
            className="min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-3"
          >
            <CardExpiryElement
              options={{ style: CARD_ELEMENT_STYLE }}
              onReady={() => {
                console.log('[StripeCardFields] CardExpiryElement ready');
                setMounted((prev) => ({ ...prev, expiry: true }));
              }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="card-cvc">CVC</Label>
          <div
            id="card-cvc"
            className="min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-3"
          >
            <CardCvcElement
              options={{ style: CARD_ELEMENT_STYLE }}
              onReady={() => {
                console.log('[StripeCardFields] CardCvcElement ready');
                setMounted((prev) => ({ ...prev, cvc: true }));
              }}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isProcessing || !stripe || !clientSecret}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay {formatAmount(amount)}
          </>
        )}
      </Button>
    </form>
  );
}
