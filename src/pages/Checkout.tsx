import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, CreditCard, Loader2, Tag, Eye, EyeOff, Lock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useGeoPricing, formatPrice } from '@/hooks/useGeoPricing';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const hslFromCssVar = (varName: string, fallbackHsl: string) => {
  if (typeof window === 'undefined') return fallbackHsl;
  const rootVal = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const bodyVal = getComputedStyle(document.body).getPropertyValue(varName).trim();
  const val = rootVal || bodyVal;
  return val ? `hsl(${val})` : fallbackHsl;
};

const getStripeCardElementStyle = () =>
  ({
    base: {
      fontSize: '16px',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      color: hslFromCssVar('--foreground', 'hsl(0 0% 10%)'),
      '::placeholder': {
        color: hslFromCssVar('--muted-foreground', 'hsl(0 0% 45%)'),
      },
      iconColor: hslFromCssVar('--secondary', 'hsl(54 82% 44%)'),
    },
    invalid: {
      color: hslFromCssVar('--destructive', 'hsl(355 74% 43%)'),
      iconColor: hslFromCssVar('--destructive', 'hsl(355 74% 43%)'),
    },
  }) as const;

type PaymentMethod = 'card' | 'paypal';

// PayPal Popup Button Component
const PayPalButton = ({ 
  productId, 
  email, 
  fullName, 
  password,
  couponCode,
  amount,
  onSuccess,
  disabled 
}: { 
  productId: string;
  email: string;
  fullName: string;
  password: string;
  couponCode?: string;
  amount: number;
  onSuccess: () => void;
  disabled: boolean;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayPal = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: {
          productId,
          email,
          fullName,
          couponCode,
          returnUrl: `${window.location.origin}/payment-success?method=paypal`,
          cancelUrl: `${window.location.origin}/checkout/${productId}`,
        },
      });

      if (error) throw error;

      if (data?.approveUrl) {
        // Open PayPal in popup window
        const width = 450;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.approveUrl,
          'PayPal',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        // Store order data for capture
        const orderData = {
          orderId: data.orderId,
          password,
          productId,
        };

        // Poll for popup close and check for success
        const pollTimer = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(pollTimer);
            
            // Check if there's a success indicator in sessionStorage
            const successData = sessionStorage.getItem('paypal_success');
            if (successData) {
              sessionStorage.removeItem('paypal_success');
              const parsed = JSON.parse(successData);
              
              // Capture the PayPal order
              try {
                const { data: captureData, error: captureError } = await supabase.functions.invoke('capture-paypal-order', {
                  body: {
                    orderId: parsed.orderId || orderData.orderId,
                    password: orderData.password,
                  },
                });

                if (captureError) throw captureError;
                
                toast.success('Payment successful!');
                onSuccess();
              } catch (captureErr: any) {
                console.error('PayPal capture error:', captureErr);
                toast.error(captureErr.message || 'Failed to complete PayPal payment');
              }
            }
            setIsLoading(false);
          }
        }, 500);

        // Listen for message from popup
        const messageHandler = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'paypal_success') {
            window.removeEventListener('message', messageHandler);
            sessionStorage.setItem('paypal_success', JSON.stringify({ orderId: event.data.orderId }));
            popup?.close();
          }
        };
        window.addEventListener('message', messageHandler);
      }
    } catch (err: any) {
      console.error('PayPal error:', err);
      toast.error(err.message || 'Failed to start PayPal checkout');
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      size="lg"
      className="w-full h-12 bg-[#FFC439] hover:bg-[#f0b429] text-[#003087] border-[#FFC439] font-bold"
      onClick={handlePayPal}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <span className="flex items-center gap-2">
          <span className="text-[#003087] font-bold italic">Pay</span>
          <span className="text-[#009CDE] font-bold italic">Pal</span>
          <span className="text-sm font-normal ml-2">Pay {formatPrice(amount, 'USD')}</span>
        </span>
      )}
    </Button>
  );
};

// Stripe Card Form Component with Apple Pay / Google Pay
const StripeCardForm = ({
  productId,
  email,
  fullName,
  password,
  couponCode,
  originalAmount,
  discountedAmount,
  onSuccess,
}: {
  productId: string;
  email: string;
  fullName: string;
  password: string;
  couponCode?: string;
  originalAmount: number;
  discountedAmount: number;
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cardFieldError, setCardFieldError] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const [themeKey, setThemeKey] = useState(0);

  const [elementsDebug, setElementsDebug] = useState(() => ({
    number: { mounted: false, focused: false, complete: false, empty: true, error: null as string | null },
    expiry: { mounted: false, focused: false, complete: false, empty: true, error: null as string | null },
    cvc: { mounted: false, focused: false, complete: false, empty: true, error: null as string | null },
  }));

  const updateDebug = (
    key: 'number' | 'expiry' | 'cvc',
    patch: Partial<(typeof elementsDebug)['number']>
  ) => {
    setElementsDebug((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new MutationObserver(() => setThemeKey((k) => k + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  const stripeElementOptions = useMemo(
    () => ({
      style: getStripeCardElementStyle(),
    }),
    [themeKey]
  );

  // Create payment intent
  useEffect(() => {
    const createIntent = async () => {
      if (!productId) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { productId, email: email || 'pending@checkout.com', fullName: fullName || 'Pending', couponCode },
        });

        if (error) throw error;
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        console.error('Payment intent error:', err);
        setError(err.message);
      }
    };

    createIntent();
  }, [productId, couponCode]);

  // Setup Apple Pay / Google Pay
  useEffect(() => {
    if (!stripe || !discountedAmount) return;

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: 'Total',
        amount: Math.round(discountedAmount * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then(result => {
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
      }
    });

    pr.on('paymentmethod', async (ev) => {
      if (!clientSecret) {
        ev.complete('fail');
        return;
      }

      const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false }
      );

      if (confirmError) {
        ev.complete('fail');
        toast.error(confirmError.message);
        return;
      }

      ev.complete('success');

      if (paymentIntent?.status === 'requires_action') {
        const { error: actionError } = await stripe.confirmCardPayment(clientSecret);
        if (actionError) {
          toast.error(actionError.message);
          return;
        }
      }

      // Complete payment
      try {
        const { error: completeError } = await supabase.functions.invoke('complete-stripe-payment', {
          body: { paymentIntentId: paymentIntent?.id, password: password || 'TempPass123!' },
        });
        if (completeError) throw completeError;
        toast.success('Payment successful!');
        onSuccess();
      } catch (err: any) {
        toast.error(err.message || 'Failed to complete payment');
      }
    });
  }, [stripe, discountedAmount, clientSecret, password, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setCardFieldError(null);

    try {
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) throw new Error('Card number element not found');

      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: fullName || email,
            email: email,
          },
        },
      });

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        const { error: completeError } = await supabase.functions.invoke('complete-stripe-payment', {
          body: { paymentIntentId: paymentIntent.id, password },
        });

        if (completeError) throw completeError;

        toast.success('Payment successful!');
        onSuccess();
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message);
      toast.error(err.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const savings = originalAmount - discountedAmount;

  return (
    <div className="space-y-4">
      {/* Apple Pay / Google Pay */}
      {canMakePayment && paymentRequest && (
        <div className="space-y-3">
          <PaymentRequestButtonElement
            options={{
              paymentRequest,
              style: {
                paymentRequestButton: {
                  type: 'default',
                  theme: 'dark',
                  height: '48px',
                },
              },
            }}
          />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or pay with card</span>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">Save 1% with card payment</span>
          <span className="text-xs text-green-600 dark:text-green-500">
            (You save {formatPrice(savings, 'USD')})
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {import.meta.env.DEV && (
          <div className="rounded-md border border-border bg-card/60 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-foreground">Stripe debug (dev)</p>
              <p className="text-muted-foreground">
                stripe: <span className="text-foreground">{stripe ? 'ready' : 'not-ready'}</span> · elements:{' '}
                <span className="text-foreground">{elements ? 'ready' : 'not-ready'}</span> · clientSecret:{' '}
                <span className="text-foreground">{clientSecret ? 'set' : 'unset'}</span>
              </p>
            </div>
            <div className="mt-2 grid gap-1 text-muted-foreground">
              {(['number', 'expiry', 'cvc'] as const).map((k) => (
                <div key={k} className="flex flex-wrap items-center gap-2">
                  <span className="w-14 uppercase">{k}</span>
                  <span>mounted: {elementsDebug[k].mounted ? 'yes' : 'no'}</span>
                  <span>focused: {elementsDebug[k].focused ? 'yes' : 'no'}</span>
                  <span>empty: {elementsDebug[k].empty ? 'yes' : 'no'}</span>
                  <span>complete: {elementsDebug[k].complete ? 'yes' : 'no'}</span>
                  {elementsDebug[k].error && <span className="text-destructive">error: {elementsDebug[k].error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Card number</Label>
          <div className="p-3 border border-input rounded-md bg-background min-h-[42px] cursor-text">
            <CardNumberElement
              options={stripeElementOptions}
              onReady={() => updateDebug('number', { mounted: true })}
              onFocus={() => updateDebug('number', { focused: true })}
              onBlur={() => updateDebug('number', { focused: false })}
              onChange={(e) => {
                updateDebug('number', { complete: e.complete, empty: e.empty, error: e.error?.message ?? null });
                setCardFieldError(e.error?.message ?? null);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Expiry</Label>
            <div className="p-3 border border-input rounded-md bg-background min-h-[42px] cursor-text">
              <CardExpiryElement
                options={stripeElementOptions}
                onReady={() => updateDebug('expiry', { mounted: true })}
                onFocus={() => updateDebug('expiry', { focused: true })}
                onBlur={() => updateDebug('expiry', { focused: false })}
                onChange={(e) => {
                  updateDebug('expiry', { complete: e.complete, empty: e.empty, error: e.error?.message ?? null });
                  setCardFieldError(e.error?.message ?? null);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>CVC</Label>
            <div className="p-3 border border-input rounded-md bg-background min-h-[42px] cursor-text">
              <CardCvcElement
                options={stripeElementOptions}
                onReady={() => updateDebug('cvc', { mounted: true })}
                onFocus={() => updateDebug('cvc', { focused: true })}
                onBlur={() => updateDebug('cvc', { focused: false })}
                onChange={(e) => {
                  updateDebug('cvc', { complete: e.complete, empty: e.empty, error: e.error?.message ?? null });
                  setCardFieldError(e.error?.message ?? null);
                }}
              />
            </div>
          </div>
        </div>

        {(cardFieldError || error) && (
          <p className="text-sm text-destructive">{cardFieldError || error}</p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isProcessing || !stripe || !clientSecret}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay {formatPrice(discountedAmount, 'USD')}
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

// Main Checkout Component
function CheckoutContent() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const { items: cartItems, clearCart } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  
  // Account creation state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const { isLoading: geoLoading, calculatePrice } = useGeoPricing();

  // Fetch product details (single product checkout)
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['checkout-product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          courses:course_id (id, title, description, cover_image_url)
        `)
        .eq('id', productId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // Determine if we're in cart mode or single product mode
  const isCartMode = !productId && cartItems.length > 0;
  const checkoutProduct = isCartMode ? null : product;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsValidatingCoupon(true);
    try {
      setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discount: 0 });
      toast.success('Coupon will be applied at checkout');
      setShowCouponInput(false);
    } catch (err) {
      toast.error('Invalid coupon code');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const handleSuccess = () => {
    if (isCartMode) {
      clearCart();
    }
    navigate('/payment-success');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }

    setIsLoggingIn(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message || 'Failed to sign in');
      } else {
        toast.success('Signed in successfully');
        setIsReturningCustomer(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (productLoading || geoLoading) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading checkout...</p>
          </div>
        </div>
      </>
    );
  }

  if (!productId && cartItems.length === 0) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
            <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
          </div>
        </div>
      </>
    );
  }

  if (productId && !product) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Product not found</h1>
            <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
          </div>
        </div>
      </>
    );
  }

  // Calculate prices
  const basePrice = isCartMode 
    ? cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    : product?.base_price_usd || 0;
  const stripeDiscount = basePrice * 0.01; // 1% discount for card
  const cardPrice = basePrice - stripeDiscount;
  const isCourse = isCartMode 
    ? cartItems.some(item => item.productType === 'course')
    : product?.product_type === 'course';
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background py-12">
        <div className="max-w-5xl mx-auto px-6">
          {/* Returning customer banner */}
          {!user && !isReturningCustomer && (
            <div className="mb-6 p-3 bg-muted/50 rounded-lg flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Returning customer?</span>
              <button 
                onClick={() => setIsReturningCustomer(true)}
                className="text-sm text-secondary hover:underline font-medium"
              >
                Click here to login
              </button>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-2 gap-8"
          >
            {/* Billing Details */}
            <div>
              <h2 className="text-lg font-semibold mb-6 uppercase tracking-wide text-muted-foreground">
                Billing Details
              </h2>
              
              <Card className="p-6">
                {user ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Logged in as <strong>{user.email}</strong>
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        toast.success('Logged out');
                      }}
                    >
                      Use a different account
                    </Button>
                  </div>
                ) : isReturningCustomer ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Sign in to your account</p>
                      <button 
                        onClick={() => setIsReturningCustomer(false)}
                        className="text-sm text-secondary hover:underline font-medium"
                      >
                        Create new account
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address <span className="text-destructive">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-background pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button 
                      onClick={handleLogin} 
                      className="w-full"
                      disabled={isLoggingIn}
                    >
                      {isLoggingIn ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Signing in...
                        </>
                      ) : (
                        'Login'
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First name <span className="text-destructive">*</span></Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last name <span className="text-destructive">*</span></Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address <span className="text-destructive">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Create account password <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-background pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your account will be created when you complete your purchase
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Your Order */}
            <div>
              <h2 className="text-lg font-semibold mb-6 uppercase tracking-wide text-muted-foreground">
                Your Order
              </h2>
              
              <Card className="p-6">
                {/* Product rows */}
                <div className="space-y-3 pb-4 border-b border-border">
                  {isCartMode ? (
                    cartItems.map((item) => (
                      <div key={item.productId} className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.quantity > 1 && (
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                          )}
                        </div>
                        <p className="font-semibold">{formatPrice(item.price * item.quantity, 'USD')}</p>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-start">
                      <p className="font-medium">{product?.name}</p>
                      <p className="font-semibold">{formatPrice(basePrice, 'USD')}</p>
                    </div>
                  )}
                </div>

                {/* Coupon section */}
                <div className="py-4 border-b border-border">
                  {!showCouponInput && !appliedCoupon && (
                    <button 
                      onClick={() => setShowCouponInput(true)}
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
                    >
                      <Tag className="h-4 w-4" />
                      Have a coupon?
                    </button>
                  )}

                  {showCouponInput && !appliedCoupon && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon || !couponCode.trim()}
                      >
                        {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                      </Button>
                    </div>
                  )}

                  {appliedCoupon && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">{appliedCoupon.code}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                {/* Payment method selection */}
                <div className="py-4 border-b border-border">
                  <Label className="mb-3 block">Payment Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                        paymentMethod === 'card' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <CreditCard className="h-5 w-5" />
                      <span className="font-medium">Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paypal')}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                        paymentMethod === 'paypal' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <span className="text-[#003087] font-bold italic">Pay</span>
                      <span className="text-[#009CDE] font-bold italic">Pal</span>
                    </button>
                  </div>
                </div>

                {/* Payment form based on selection */}
                <div className="py-6">
                  {paymentMethod === 'card' ? (
                    <StripeCardForm
                      productId={productId || cartItems[0]?.productId || ''}
                      email={user?.email || email}
                      fullName={fullName || user?.email || email}
                      password={password}
                      couponCode={appliedCoupon?.code}
                      originalAmount={basePrice}
                      discountedAmount={cardPrice}
                      onSuccess={handleSuccess}
                    />
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        You'll be redirected to PayPal to complete your purchase.
                      </p>
                      <PayPalButton
                        productId={productId || cartItems[0]?.productId || ''}
                        email={user?.email || email}
                        fullName={fullName || user?.email || email}
                        password={password}
                        couponCode={appliedCoupon?.code}
                        amount={basePrice}
                        onSuccess={handleSuccess}
                        disabled={!email}
                      />
                    </div>
                  )}
                </div>

                {/* Security & guarantee */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Secure checkout</span>
                  </div>
                  
                  {isCourse && (
                    <p className="text-center text-sm text-green-600 font-medium">
                      30-Day 110% Money Back Guarantee
                    </p>
                  )}

                  <div className="flex justify-center gap-2">
                    <div className="w-10 h-6 bg-[#1A1F71] rounded text-white text-[8px] flex items-center justify-center font-bold">VISA</div>
                    <div className="w-10 h-6 bg-[#EB001B] rounded text-white text-[8px] flex items-center justify-center font-bold">MC</div>
                    <div className="w-10 h-6 bg-[#006FCF] rounded text-white text-[8px] flex items-center justify-center font-bold">AMEX</div>
                    <div className="w-10 h-6 bg-black rounded text-white text-[8px] flex items-center justify-center font-bold"> Pay</div>
                    <div className="w-10 h-6 bg-[#FFC439] rounded text-[#003087] text-[6px] flex items-center justify-center font-bold italic">PayPal</div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

export default function Checkout() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutContent />
    </Elements>
  );
}
