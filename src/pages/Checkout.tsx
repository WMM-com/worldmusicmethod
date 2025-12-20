import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Elements } from '@stripe/react-stripe-js';
import { StripeCardFields } from '@/components/checkout/StripeCardFields';

type PaymentMethod = 'card' | 'paypal';

// PayPal Button Component
const PayPalButton = ({
  productId,
  email,
  fullName,
  password,
  couponCode,
  amount,
  onSuccess,
  disabled,
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
        const width = 450;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          data.approveUrl,
          'PayPal',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        const orderData = { orderId: data.orderId, password, productId };

        const pollTimer = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(pollTimer);
            const successData = sessionStorage.getItem('paypal_success');
            if (successData) {
              sessionStorage.removeItem('paypal_success');
              const parsed = JSON.parse(successData);
              try {
                const { error: captureError } = await supabase.functions.invoke('capture-paypal-order', {
                  body: { orderId: parsed.orderId || orderData.orderId, password: orderData.password },
                });
                if (captureError) throw captureError;
                toast.success('Payment successful!');
                onSuccess();
              } catch (captureErr: any) {
                toast.error(captureErr.message || 'Failed to complete PayPal payment');
              }
            }
            setIsLoading(false);
          }
        }, 500);

        const messageHandler = (event: MessageEvent) => {
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

// Hook to get Stripe publishable key
function useStripePublishableKey() {
  const [pk, setPk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Try environment variable first
        const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
        if (envKey && envKey.startsWith('pk_')) {
          setPk(envKey);
          setLoading(false);
          return;
        }

        // Try localStorage
        const stored = localStorage.getItem('stripe_publishable_key');
        if (stored && stored.startsWith('pk_')) {
          setPk(stored);
          setLoading(false);
          return;
        }

        // Fetch from backend
        const { data, error } = await supabase.functions.invoke('get-stripe-publishable-key');
        if (error) throw error;
        const fetched = data?.publishableKey as string | undefined;
        if (!cancelled && fetched && fetched.startsWith('pk_')) {
          setPk(fetched);
        }
      } catch (err) {
        console.error('Failed to get Stripe publishable key:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { pk, loading };
}

// Main Checkout Content
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

  const { isLoading: geoLoading } = useGeoPricing();

  // Fetch product details
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['checkout-product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`*, courses:course_id (id, title, description, cover_image_url)`)
        .eq('id', productId)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const isCartMode = !productId && cartItems.length > 0;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    try {
      setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discount: 0 });
      toast.success('Coupon will be applied at checkout');
      setShowCouponInput(false);
    } catch {
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
    if (isCartMode) clearCart();
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

  const basePrice = isCartMode
    ? cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    : product?.base_price_usd || 0;
  const stripeDiscount = basePrice * 0.01;
  const cardPrice = basePrice - stripeDiscount;
  const isCourse = isCartMode
    ? cartItems.some((item) => item.productType === 'course')
    : product?.product_type === 'course';
  const fullName = `${firstName} ${lastName}`.trim();

  const debugEnabled =
    typeof window !== 'undefined' &&
    (import.meta.env.DEV ||
      new URLSearchParams(window.location.search).has('stripeDebug') ||
      localStorage.getItem('stripeDebug') === '1');

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

          <div className="grid lg:grid-cols-2 gap-8">
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
                      <Label htmlFor="email">
                        Email address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">
                        Password <span className="text-destructive">*</span>
                      </Label>
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
                    <Button onClick={handleLogin} className="w-full" disabled={isLoggingIn}>
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
                        <Label htmlFor="firstName">
                          First name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">
                          Last name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">
                        Create account password <span className="text-destructive">*</span>
                      </Label>
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

                {/* Payment form */}
                <div className="py-6">
                  {paymentMethod === 'card' ? (
                    <>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-4">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          <span className="text-sm font-medium">Save 1% with card payment</span>
                          <span className="text-xs text-green-600 dark:text-green-500">
                            (You save {formatPrice(stripeDiscount, 'USD')})
                          </span>
                        </div>
                      </div>
                      <StripeCardFields
                        productId={productId || cartItems[0]?.productId || ''}
                        email={user?.email || email}
                        fullName={fullName || user?.email || email}
                        password={password}
                        couponCode={appliedCoupon?.code}
                        amount={cardPrice}
                        onSuccess={handleSuccess}
                        debugEnabled={debugEnabled}
                      />
                    </>
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
                    <div className="w-10 h-6 bg-[#1A1F71] rounded text-white text-[8px] flex items-center justify-center font-bold">
                      VISA
                    </div>
                    <div className="w-10 h-6 bg-[#EB001B] rounded text-white text-[8px] flex items-center justify-center font-bold">
                      MC
                    </div>
                    <div className="w-10 h-6 bg-[#006FCF] rounded text-white text-[8px] flex items-center justify-center font-bold">
                      AMEX
                    </div>
                    <div className="w-10 h-6 bg-black rounded text-white text-[8px] flex items-center justify-center font-bold">
                      Pay
                    </div>
                    <div className="w-10 h-6 bg-[#FFC439] rounded text-[#003087] text-[6px] flex items-center justify-center font-bold italic">
                      PayPal
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Checkout() {
  const { pk, loading } = useStripePublishableKey();

  const stripePromise = useMemo(() => (pk ? loadStripe(pk) : null), [pk]);

  if (loading) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!pk) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center max-w-md p-6">
            <h1 className="text-xl font-bold mb-2">Payment Not Available</h1>
            <p className="text-muted-foreground">
              Card payments are not configured. Please contact support.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <Elements stripe={stripePromise} key={pk}>
      <CheckoutContent />
    </Elements>
  );
}
