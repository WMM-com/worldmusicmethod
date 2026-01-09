import { useState } from 'react';
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
import { formatPrice } from '@/hooks/useGeoPricing';

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
  productIds: string[];
  amounts: number[];
  email: string;
  fullName: string;
  password: string;
  couponCode?: string;
  totalAmount: number;
  currency?: string;
  onSuccess: () => void;
  debugEnabled?: boolean;
  isLoggedIn?: boolean;
}

export function StripeCardFields({
  productIds,
  amounts,
  email,
  fullName,
  password,
  couponCode,
  totalAmount,
  currency = 'USD',
  onSuccess,
  debugEnabled = false,
  isLoggedIn = false,
}: StripeCardFieldsProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug state
  const [mounted, setMounted] = useState({ number: false, expiry: false, cvc: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error('Payment system not ready. Please wait a moment and try again.');
      return;
    }

    // Validate email before proceeding
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate password for new accounts
    if (!isLoggedIn && (!password || password.length < 8)) {
      toast.error('Please enter a password with at least 8 characters');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        throw new Error('Card input not found. Please refresh and try again.');
      }

      // Create payment intent with geo-priced currency and amounts
      console.log('[StripeCardFields] Creating payment intent...', { productIds, amounts, currency });
      const { data: intentData, error: intentError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          productIds,
          amounts,
          email,
          fullName: fullName || email.split('@')[0],
          couponCode,
          currency,
        },
      });

      if (intentError) throw intentError;
      
      // Check if this is a free trial product (no payment required)
      if (intentData?.freeTrialMode) {
        console.log('[StripeCardFields] Free trial detected, creating subscription without payment...');
        
        // Get the payment method for future billing
        const cardNumberElement = elements.getElement(CardNumberElement);
        let paymentMethodId: string | null = null;
        
        if (cardNumberElement) {
          const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardNumberElement,
            billing_details: {
              name: fullName || email,
              email,
            },
          });
          
          if (!pmError && paymentMethod) {
            paymentMethodId = paymentMethod.id;
          }
        }
        
        // Create free trial subscription - pass geo pricing currency and amount
        const { data: trialData, error: trialError } = await supabase.functions.invoke('create-free-trial-subscription', {
          body: {
            productId: intentData.productId,
            email,
            fullName: fullName || email.split('@')[0],
            password,
            paymentMethodId,
            couponCode,
            currency,  // Pass geo-adjusted currency
            amount: amounts[0], // Pass geo-adjusted amount
          },
        });
        
        if (trialError) throw trialError;
        
        // Sign in the user if new - wait for email_verified to be set
        if (trialData?.userId && password) {
          // Wait for backend to set email_verified
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          try {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (signInError) {
              console.error('[StripeCardFields] Free trial auto sign-in failed:', signInError);
              toast.info('Please sign in to access your trial');
            } else {
              console.log('[StripeCardFields] Free trial auto sign-in successful');
              // Wait for session to establish before redirect
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch {
            toast.info('Please sign in to access your trial');
          }
        }
        
        toast.success(`Free trial started! Your ${intentData.trialDays}-day trial begins now.`);
        onSuccess();
        return;
      }
      
      if (!intentData?.clientSecret) {
        throw new Error('Failed to initialize payment');
      }

      console.log('[StripeCardFields] Got client secret, confirming payment...', { 
        intentCurrency: intentData.currency,
        amount: intentData.amount 
      });
      
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(intentData.clientSecret, {
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
        const { data: completeData, error: completeError } = await supabase.functions.invoke('complete-stripe-payment', {
          body: { paymentIntentId: paymentIntent.id, password },
        });

        if (completeError) throw completeError;

        // If new user was created, sign them in automatically
        if (completeData?.isNewUser && completeData?.email && password) {
          console.log('[StripeCardFields] New user created, signing in automatically...');
          
          // Wait longer to ensure the backend has fully completed setting email_verified
          // Backend waits 2000ms + retries, so we wait 4000ms to be safe
          await new Promise(resolve => setTimeout(resolve, 4000));
          
          try {
            // Use signInWithPassword directly to avoid the email verification check in AuthContext
            // The complete-stripe-payment function has already set email_verified = true
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: completeData.email,
              password,
            });
            
            if (signInError) {
              console.error('[StripeCardFields] Auto sign-in failed:', signInError);
              // Don't fail the whole flow, user can sign in manually
              toast.info('Please sign in to access your purchase');
            } else {
              console.log('[StripeCardFields] Auto sign-in successful');
              // Wait for session to be established
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (signInErr) {
            console.error('[StripeCardFields] Auto sign-in error:', signInErr);
            toast.info('Please sign in to access your purchase');
          }
        }

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

  const isFormValid = stripe && email && email.includes('@') && (isLoggedIn || (password && password.length >= 8));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Debug panel */}
      {debugEnabled && (
        <div className="rounded border border-gray-300 bg-gray-50 p-3 text-xs font-mono">
          <div className="space-y-1">
            <div>stripe: {stripe ? '✓ ready' : '✗ not ready'}</div>
            <div>elements: {elements ? '✓ ready' : '✗ not ready'}</div>
            <div>email: {email ? '✓ set' : '✗ not set'}</div>
            <div>currency: {currency}</div>
            <div>productIds: {productIds.join(', ')}</div>
            <div>amounts: {amounts.join(', ')}</div>
            <div>number mounted: {mounted.number ? '✓' : '✗'}</div>
            <div>expiry mounted: {mounted.expiry ? '✓' : '✗'}</div>
            <div>cvc mounted: {mounted.cvc ? '✓' : '✗'}</div>
          </div>
        </div>
      )}

      {/* Card details - single row layout */}
      <div className="space-y-2">
        <Label htmlFor="card-number">Card details</Label>
        <div className="flex rounded-md border border-gray-300 bg-white overflow-hidden">
          {/* Card number - takes up more space */}
          <div
            id="card-number"
            className="flex-1 min-h-[44px] px-3 py-3 border-r border-gray-300"
          >
            <CardNumberElement
              options={{ style: CARD_ELEMENT_STYLE }}
              onReady={() => {
                console.log('[StripeCardFields] CardNumberElement ready');
                setMounted((prev) => ({ ...prev, number: true }));
              }}
            />
          </div>
          {/* Expiry */}
          <div
            id="card-expiry"
            className="w-24 min-h-[44px] px-3 py-3 border-r border-gray-300"
          >
            <CardExpiryElement
              options={{ style: CARD_ELEMENT_STYLE }}
              onReady={() => {
                console.log('[StripeCardFields] CardExpiryElement ready');
                setMounted((prev) => ({ ...prev, expiry: true }));
              }}
            />
          </div>
          {/* CVC */}
          <div
            id="card-cvc"
            className="w-16 min-h-[44px] px-3 py-3"
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
        disabled={isProcessing || !isFormValid}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay {formatPrice(totalAmount, currency)}
          </>
        )}
      </Button>
    </form>
  );
}
