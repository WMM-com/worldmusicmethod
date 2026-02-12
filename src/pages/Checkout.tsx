import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, Loader2, Tag, Eye, EyeOff, Lock, X } from 'lucide-react';
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
import { SubscriptionDetails } from '@/components/checkout/SubscriptionDetails';
import { PwyfSlider } from '@/components/checkout/PwyfSlider';
import { CreditPaymentSection } from '@/components/checkout/CreditPaymentSection';

type PaymentMethod = 'card' | 'paypal';

// PayPal Button Component
const PayPalButton = ({
  productId,
  email,
  fullName,
  password,
  couponCode,
  couponDiscount,
  amount,
  currency,
  productType,
  trialAmount,
  onSuccess,
  disabled,
}: {
  productId: string;
  email: string;
  fullName: string;
  password: string;
  couponCode?: string;
  couponDiscount?: number;
  amount: number;
  currency: string;
  productType?: string;
  trialAmount?: number;
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
      // Note: We no longer store credentials in sessionStorage
      // The server will generate a one-time auth token after payment
      
      const isSubscription = productType === 'subscription' || productType === 'membership';
      
      if (isSubscription) {
        // Handle subscription / membership flow
        const { data, error } = await supabase.functions.invoke('create-subscription', {
          body: {
            productId,
            email,
            fullName,
            paymentMethod: 'paypal',
            couponCode,
            couponDiscount: couponDiscount || 0,
            amount,
            currency,
            trialAmount, // Geo-priced trial amount for PayPal plan consistency
            returnUrl: `${window.location.origin}/payment-success?method=paypal&paypalFlow=subscription`,
          },
        });

        if (data?.error) throw new Error(data.error);
        if (error) throw new Error('Failed to start PayPal subscription. Please try again.');

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

          // Store the subscription details
          const paypalSubscriptionId = data.subscriptionId;
          const dbSubscriptionId = data.dbSubscriptionId;

          const pollTimer = setInterval(async () => {
            if (popup?.closed) {
              clearInterval(pollTimer);
              const successData = sessionStorage.getItem('paypal_success');
              if (successData) {
                sessionStorage.removeItem('paypal_success');
                const parsed = JSON.parse(successData);
                try {
                  // Activate the subscription in the database
                  const { data: activateData, error: activateError } = await supabase.functions.invoke('activate-paypal-subscription', {
                    body: { 
                      subscriptionId: parsed.subscriptionId || paypalSubscriptionId,
                      dbSubscriptionId,
                    },
                  });
                  if (activateData?.error) throw new Error(activateData.error);
                  if (activateError) throw new Error('Failed to activate subscription. Please try again.');
                  
                  // Auto sign-in using one-time auth token
                  if (activateData?.authToken) {
                    try {
                      const { data: tokenData } = await supabase.functions.invoke('consume-auth-token', {
                        body: { token: activateData.authToken },
                      });
                      if (tokenData?.tokenHash && tokenData?.email) {
                        await supabase.auth.verifyOtp({
                          email: tokenData.email,
                          token: tokenData.tokenHash,
                          type: 'magiclink',
                        });
                        console.log('[PayPal] Auto sign-in successful via token');
                      }
                    } catch (signInErr) {
                      console.warn('[PayPal] Auto sign-in failed:', signInErr);
                    }
                  }
                  
                  toast.success('Subscription activated!');
                  onSuccess();
                } catch (activateErr: any) {
                  toast.error(activateErr.message || 'Failed to activate subscription');
                }
              }
              setIsLoading(false);
            }
          }, 500);

          const messageHandler = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data.type === 'paypal_success') {
              window.removeEventListener('message', messageHandler);
              sessionStorage.setItem('paypal_success', JSON.stringify({ 
                subscriptionId: event.data.subscriptionId || paypalSubscriptionId,
                dbSubscriptionId,
              }));
              popup?.close();
            }
          };
          window.addEventListener('message', messageHandler);
        }
      } else {
        // Handle one-time payment flow
        const { data, error } = await supabase.functions.invoke('create-paypal-order', {
          body: {
            productId,
            email,
            fullName,
            couponCode,
            currency,
            amount,
            returnUrl: `${window.location.origin}/payment-success?method=paypal`,
            cancelUrl: `${window.location.origin}/checkout/${productId}`,
          },
        });

        if (data?.error) throw new Error(data.error);
        if (error) throw new Error('Failed to start PayPal checkout. Please try again.');

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

          const paypalOrderId = data.orderId;

          const pollTimer = setInterval(async () => {
            if (popup?.closed) {
              clearInterval(pollTimer);
              const successData = sessionStorage.getItem('paypal_success');
              if (successData) {
                sessionStorage.removeItem('paypal_success');
                const parsed = JSON.parse(successData);
                const captureOrderId = parsed.orderId || paypalOrderId;
                try {
                  const { data: captureData, error: captureError } = await supabase.functions.invoke('capture-paypal-order', {
                    body: { orderId: captureOrderId },
                  });
                  if (captureData?.error) throw new Error(captureData.error);
                  if (captureError) throw new Error('Failed to complete PayPal payment. Please try again.');
                  
                  // Auto sign-in using one-time auth token
                  if (captureData?.authToken) {
                    try {
                      const { data: tokenData } = await supabase.functions.invoke('consume-auth-token', {
                        body: { token: captureData.authToken },
                      });
                      if (tokenData?.tokenHash && tokenData?.email) {
                        await supabase.auth.verifyOtp({
                          email: tokenData.email,
                          token: tokenData.tokenHash,
                          type: 'magiclink',
                        });
                        console.log('[PayPal] Auto sign-in successful via token');
                      }
                    } catch (signInErr) {
                      console.warn('[PayPal] Auto sign-in failed:', signInErr);
                    }
                  }
                  
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
              sessionStorage.setItem('paypal_success', JSON.stringify({ 
                orderId: event.data.orderId || paypalOrderId 
              }));
              popup?.close();
            }
          };
          window.addEventListener('message', messageHandler);
        }
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
          <span className="text-sm font-normal ml-2">Pay {formatPrice(amount, currency)}</span>
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

        // Fallback: fetch from backend edge function
        const { data, error } = await supabase.functions.invoke('get-stripe-publishable-key');
        if (error) throw error;
        const fetched = data?.publishableKey as string | undefined;
        if (!cancelled && fetched && fetched.startsWith('pk_')) {
          setPk(fetched);
        } else {
          console.warn('VITE_STRIPE_PUBLISHABLE_KEY not set and backend fallback failed');
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
  const { items: cartItems, clearCart, removeFromCart, hasPwyfProduct, updateCustomPrice } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ 
    code: string; 
    discountType: 'percentage' | 'fixed';
    percentOff?: number;
    amountOff?: number;
    currency?: string;
  } | null>(null);
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
  
  // Pay What You Feel pricing
  const [pwyfPrice, setPwyfPrice] = useState<number | null>(null);
  
  // Referral credits state
  const [useCredits, setUseCredits] = useState(false);
  const [creditAmountUsed, setCreditAmountUsed] = useState(0);

  const { calculatePrice, isLoading: geoLoading, countryCode } = useGeoPricing();

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

  // Fetch product-specific regional pricing
  const { data: productRegionalPricing } = useQuery({
    queryKey: ['product-regional-pricing', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_regional_pricing')
        .select('region, discount_percentage, currency, fixed_price')
        .eq('product_id', productId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });

  const isCartMode = !productId && cartItems.length > 0;

  // Find subscription/membership items in cart for subscription details display
  const subscriptionCartItem = cartItems.find(item => 
    item.productType === 'subscription' || item.productType === 'membership'
  );

  // Fetch subscription product details when in cart mode with a subscription
  const { data: cartSubscriptionProduct } = useQuery({
    queryKey: ['cart-subscription-product', subscriptionCartItem?.productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, billing_interval, trial_enabled, trial_length_days, trial_price_usd, base_price_usd')
        .eq('id', subscriptionCartItem!.productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!subscriptionCartItem?.productId,
  });

  // Fetch user's credit balance
  const { data: userCredits } = useQuery({
    queryKey: ['user-credits-checkout', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
  
  const creditBalance = userCredits?.balance || 0;

  // Handle credit usage changes
  const handleCreditUsageChange = useCallback((useCreds: boolean, amount: number) => {
    setUseCredits(useCreds);
    setCreditAmountUsed(amount);
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const productIdsToCheck = isCartMode
        ? cartItems.map((item) => item.productId)
        : productId
          ? [productId]
          : [];

      const { data, error } = await supabase.functions.invoke('validate-coupon', {
        body: {
          couponCode: couponCode.trim(),
          productIds: productIdsToCheck,
        },
      });

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (error) {
        toast.error('Failed to validate coupon. Please try again.');
        return;
      }

      const coupon = (data as any)?.coupon as
        | {
            code: string;
            discountType: 'percentage' | 'fixed';
            percentOff?: number | null;
            amountOff?: number | null;
            currency?: string | null;
          }
        | undefined;

      if (!coupon) {
        toast.error('Invalid coupon code');
        return;
      }

      setAppliedCoupon({
        code: coupon.code,
        discountType: coupon.discountType,
        percentOff: coupon.percentOff ?? undefined,
        amountOff: coupon.amountOff ?? undefined,
        currency: coupon.currency ?? 'USD',
      });
      toast.success(`Coupon "${coupon.code}" applied!`);
      setShowCouponInput(false);
    } catch (err) {
      console.error('Coupon validation error:', err);
      toast.error('Failed to validate coupon');
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

  // Calculate prices with geo pricing for single product mode
  const productPriceInfo = product ? calculatePrice(product.base_price_usd, productRegionalPricing || []) : null;
  
  // Check if product is a subscription/membership
  const isSubscriptionProduct = product?.product_type === 'subscription' || product?.product_type === 'membership';
  
  // Check if product has PWYF pricing
  const isPwyfProduct = product?.is_pwyf && product?.min_price != null;
  const pwyfMin = product?.min_price || 0;
  const pwyfMax = product?.max_price || 100;
  const pwyfSuggested = product?.suggested_price || pwyfMin;
  
  // Check if cart contains PWYF products
  const cartHasPwyf = isCartMode && hasPwyfProduct();
  
  // Get currency symbol for current region
  const getCurrencySymbol = (curr: string) => {
    const symbols: Record<string, string> = { USD: '$', GBP: '£', EUR: '€' };
    return symbols[curr] || '$';
  };

  // Calculate geo-adjusted PWYF bounds
  // For PWYF subscriptions, use regional pricing fixed_price as the min floor
  const geoRatio = productPriceInfo && product?.base_price_usd 
    ? productPriceInfo.price / product.base_price_usd 
    : 1;
  
  // Use regional pricing fixed_price as geo min if available (set up as min price per region)
  const regionalFixedPrice = productRegionalPricing?.find(rp => {
    // The regionalpPricing matched by calculatePrice already determines the active region
    return rp.fixed_price && rp.fixed_price > 0;
  });
  
  // For PWYF subscriptions, the regional fixed_price IS the geo minimum
  const geoPwyfMin = isPwyfProduct && productPriceInfo?.price
    ? Math.round(productPriceInfo.price) // productPriceInfo.price = regional fixed_price for this product
    : Math.round(pwyfMin * geoRatio);
  const geoPwyfMax = Math.round(pwyfMax * geoRatio);
  const geoPwyfSuggested = Math.round(pwyfSuggested * geoRatio);

  // Initialize PWYF price to suggested price when product loads
  useEffect(() => {
    if (isPwyfProduct && pwyfPrice === null) {
      setPwyfPrice(geoPwyfSuggested);
    }
  }, [isPwyfProduct, geoPwyfSuggested, pwyfPrice]);
  
  // Validate PWYF price
  const isPwyfPriceValid = !isPwyfProduct || (
    pwyfPrice !== null && 
    pwyfPrice >= geoPwyfMin && 
    pwyfPrice <= geoPwyfMax
  );
  
  // Calculate actual base price (either PWYF or regular)
  const effectiveBasePrice = isPwyfProduct && pwyfPrice !== null 
    ? pwyfPrice 
    : (isCartMode ? cartItems.reduce((sum, item) => sum + (item.customPrice ?? item.price), 0) : productPriceInfo?.price || 0);
  
  const basePrice = effectiveBasePrice;
  const currency = isCartMode
    ? cartItems[0]?.currency || 'USD'
    : productPriceInfo?.currency || 'USD';

  // Calculate coupon discount
  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'percentage' && appliedCoupon.percentOff) {
      return basePrice * (appliedCoupon.percentOff / 100);
    }
    if (appliedCoupon.discountType === 'fixed' && appliedCoupon.amountOff) {
      // For fixed discounts, we use the amount directly (assuming same currency or converted)
      return Math.min(appliedCoupon.amountOff, basePrice);
    }
    return 0;
  }, [appliedCoupon, basePrice]);

  const priceAfterCoupon = basePrice - couponDiscount;
  const stripeDiscount = priceAfterCoupon * 0.02;
  const cardPriceBeforeCredits = priceAfterCoupon - stripeDiscount;
  
  // Calculate price after applying referral credits
  // creditAmountUsed is in USD cents, convert to regional currency for display
  const creditDiscountInRegionalCurrency = useCredits ? (creditAmountUsed / 100) * geoRatio : 0;
  const cardPrice = Math.max(0, cardPriceBeforeCredits - creditDiscountInRegionalCurrency);
  const isFullyCoveredByCredits = useCredits && creditDiscountInRegionalCurrency >= cardPriceBeforeCredits;
  const isCourse = isCartMode
    ? cartItems.some((item) => item.productType === 'course')
    : product?.product_type === 'course';
  const fullName = `${firstName} ${lastName}`.trim();

  // Calculate geo-priced trial amount for subscriptions
  const geoTrialAmount = useMemo(() => {
    const subProduct = isCartMode ? cartSubscriptionProduct : product;
    if (!subProduct?.trial_enabled || !subProduct?.trial_price_usd) return undefined;
    
    // Calculate the ratio from geo pricing
    if (isCartMode && subscriptionCartItem && subProduct.base_price_usd) {
      return subProduct.trial_price_usd * subscriptionCartItem.price / subProduct.base_price_usd;
    }
    if (productPriceInfo && subProduct.base_price_usd) {
      return subProduct.trial_price_usd * productPriceInfo.price / subProduct.base_price_usd;
    }
    return subProduct.trial_price_usd;
  }, [isCartMode, cartSubscriptionProduct, product, subscriptionCartItem, productPriceInfo]);

  const debugEnabled =
    typeof window !== 'undefined' &&
    (import.meta.env.DEV ||
      new URLSearchParams(window.location.search).has('stripeDebug') ||
      localStorage.getItem('stripeDebug') === '1');

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background py-6 sm:py-12 overflow-x-hidden">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">
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

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-8">
            {/* Billing Details */}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 uppercase tracking-wide text-muted-foreground">
                Billing Details
              </h2>

              <Card className="p-4 sm:p-6 overflow-hidden">
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
                          minLength={8}
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
                      {password && password.length < 8 && (
                        <p className="text-xs text-destructive">Password must be at least 8 characters</p>
                      )}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          minLength={8}
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
                      {password && password.length < 8 && (
                        <p className="text-xs text-destructive">Password must be at least 8 characters</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Your account will be created when you complete your purchase
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Your Order */}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 uppercase tracking-wide text-muted-foreground">
                Your Order
              </h2>

              <Card className="p-4 sm:p-6 overflow-hidden">
                {/* Product rows */}
                <div className="space-y-3 pb-4 border-b border-border">
                  {isCartMode ? (
                    <>
                      {cartItems.map((item) => (
                        <div key={item.productId} className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              {item.isPwyf && (
                                <span className="text-xs text-primary">Pay What You Feel</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{formatPrice(item.customPrice ?? item.price, item.currency || 'USD')}</p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => removeFromCart(item.productId)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {/* PWYF Slider for cart items */}
                          {item.isPwyf && item.minPrice !== undefined && item.maxPrice !== undefined && (
                            <div className="pt-2 pb-2">
                              <PwyfSlider
                                value={item.customPrice ?? item.price}
                                onChange={(newPrice) => updateCustomPrice(item.productId, newPrice)}
                                min={item.minPrice}
                                max={item.maxPrice}
                                suggested={Math.round((item.minPrice + item.maxPrice) / 2)}
                                currency={item.currency || 'USD'}
                                currencySymbol={getCurrencySymbol(item.currency || 'USD')}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{product?.name}</p>
                        {!isPwyfProduct && <p className="font-semibold">{formatPrice(basePrice, currency)}</p>}
                      </div>
                      
                      {/* Pay What You Feel Slider */}
                      {isPwyfProduct && pwyfPrice !== null && (
                        <div className="pt-2">
                          <PwyfSlider
                            value={pwyfPrice}
                            onChange={setPwyfPrice}
                            min={geoPwyfMin}
                            max={geoPwyfMax}
                            suggested={geoPwyfSuggested}
                            currency={currency}
                            currencySymbol={getCurrencySymbol(currency)}
                            billingLabel={isSubscriptionProduct ? 'Monthly' : undefined}
                          />
                          {!isPwyfPriceValid && (
                            <p className="text-xs text-destructive mt-2">
                              Please select a price between {getCurrencySymbol(currency)}{geoPwyfMin} and {getCurrencySymbol(currency)}{geoPwyfMax}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Subscription Details - shown for subscription/membership products */}
                {(() => {
                  // Determine which product data to use for subscription details
                  const subProduct = isCartMode ? cartSubscriptionProduct : product;
                  const showDetails = subProduct && (
                    (isCartMode && subscriptionCartItem) || 
                    (!isCartMode && (product?.product_type === 'subscription' || product?.product_type === 'membership'))
                  );
                  
                  if (!showDetails || !subProduct) return null;
                  
                  // Get the current price (with payment method discount if card selected)
                  const currentBasePrice = isCartMode && subscriptionCartItem ? subscriptionCartItem.price : basePrice;
                  const currentPriceAfterCoupon = currentBasePrice - (appliedCoupon ? couponDiscount : 0);
                  const paymentDiscount = paymentMethod === 'card' ? currentPriceAfterCoupon * 0.02 : 0;
                  
                  // Calculate trial price with regional pricing and payment method discount
                  const trialPriceCalculated = subProduct.trial_price_usd 
                    ? (isCartMode && subscriptionCartItem
                        ? (subProduct.trial_price_usd * subscriptionCartItem.price / subProduct.base_price_usd)
                        : (productPriceInfo 
                            ? (subProduct.trial_price_usd * productPriceInfo.price / subProduct.base_price_usd)
                            : subProduct.trial_price_usd))
                    : 0;
                  
                  return (
                    <SubscriptionDetails
                      productName={subProduct.name}
                      price={currentPriceAfterCoupon}
                      currency={currency}
                      interval={subProduct.billing_interval || 'monthly'}
                      trialEnabled={subProduct.trial_enabled || false}
                      trialLengthDays={subProduct.trial_length_days || 0}
                      trialPrice={trialPriceCalculated}
                      paymentMethodDiscount={paymentDiscount}
                    />
                  );
                })()}

                {/* Coupon discount row - shown when coupon applied */}
                {appliedCoupon && couponDiscount > 0 && (
                  <div className="py-3 border-b border-border">
                    <div className="flex justify-between items-center text-green-600">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        <span className="text-sm">
                          Coupon: {appliedCoupon.code}
                          {appliedCoupon.discountType === 'percentage' && ` (${appliedCoupon.percentOff}% off)`}
                        </span>
                      </div>
                      <span className="font-medium">-{formatPrice(couponDiscount, currency)}</span>
                    </div>
                  </div>
                )}

                {/* Total row - always shown */}
                <div className="py-4 border-b border-border">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">Total</p>
                      {paymentMethod === 'card' && (
                        <p className="text-xs text-green-600">
                          Save 2% when paying with card ({formatPrice(stripeDiscount, currency)})
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {(couponDiscount > 0 || useCredits) && (
                        <p className="text-sm text-muted-foreground line-through">
                          {formatPrice(basePrice, currency)}
                        </p>
                      )}
                      {isFullyCoveredByCredits ? (
                        <p className="font-bold text-lg text-primary">
                          Free with Credits!
                        </p>
                      ) : (
                        <p className="font-bold text-lg">
                          {formatPrice(paymentMethod === 'card' ? cardPrice : priceAfterCoupon, currency)}
                        </p>
                      )}
                    </div>
                  </div>
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
                      <span className="text-sm text-muted-foreground">Coupon applied</span>
                      <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} className="text-destructive hover:text-destructive">
                        Remove coupon
                      </Button>
                    </div>
                  )}
                </div>

                {/* Referral Credits section - only show for logged in users with credits */}
                {user && creditBalance > 0 && (
                  <CreditPaymentSection
                    creditBalance={creditBalance}
                    cartTotal={cardPriceBeforeCredits}
                    currency={currency}
                    geoConversionRate={geoRatio}
                    onCreditUsageChange={handleCreditUsageChange}
                  />
                )}

                {/* Payment method selection - Hide PayPal for PWYF products */}
                <div className="py-4 border-b border-border">
                  <Label className="mb-3 block">Payment Method</Label>
                  {(isPwyfProduct || cartHasPwyf) ? (
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg border-2 border-primary bg-primary/5 flex items-center justify-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        <span className="font-medium">Card Payment</span>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Pay What You Feel products require card payment
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-2 sm:p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                          paymentMethod === 'card'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="font-medium text-sm sm:text-base">Card</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('paypal')}
                        className={`p-2 sm:p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-0.5 sm:gap-2 ${
                          paymentMethod === 'paypal'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        <span className="text-[#003087] font-bold italic text-sm sm:text-base">Pay</span>
                        <span className="text-[#009CDE] font-bold italic text-sm sm:text-base">Pal</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Payment form */}
                <div className="py-4 sm:py-6">
                  {(paymentMethod === 'card' || isPwyfProduct || cartHasPwyf) ? (
                    <StripeCardFields
                      productIds={isCartMode ? cartItems.map(item => item.productId) : [productId || '']}
                      amounts={
                        // For PWYF subscriptions, pass the raw PWYF price (no card discount — subscription handles pricing)
                        isSubscriptionProduct && isPwyfProduct && pwyfPrice !== null
                          ? [pwyfPrice]
                          : isCartMode 
                            ? cartItems.map(item => {
                                const itemPrice = item.isPwyf && item.customPrice !== undefined
                                  ? item.customPrice
                                  : item.price;
                                const itemRatio = basePrice > 0 ? itemPrice / basePrice : 1;
                                const afterCoupon = itemPrice - (couponDiscount * itemRatio);
                                return afterCoupon - (afterCoupon * 0.02);
                              }) 
                            : [cardPrice]
                      }
                      email={user?.email || email}
                      fullName={fullName || user?.email || email}
                      password={password}
                      couponCode={appliedCoupon?.code}
                      totalAmount={isSubscriptionProduct && isPwyfProduct && pwyfPrice !== null ? pwyfPrice : cardPrice}
                      currency={currency}
                      onSuccess={handleSuccess}
                      debugEnabled={debugEnabled}
                      isLoggedIn={!!user}
                      isPwyf={isPwyfProduct || cartHasPwyf}
                      pwyfValid={isPwyfPriceValid}
                      creditAmountUsed={useCredits ? creditAmountUsed : 0}
                      // Subscription props
                      isSubscription={isSubscriptionProduct || (isCartMode && !!subscriptionCartItem)}
                      productType={product?.product_type || subscriptionCartItem?.productType}
                      billingInterval={product?.billing_interval || 'monthly'}
                      countryCode={countryCode}
                      onFreeCheckout={async (data) => {
                        try {
                          const { data: result, error } = await supabase.functions.invoke('complete-free-credit-checkout', {
                            body: {
                              productIds: data.productIds,
                              email: data.email,
                              fullName: data.fullName,
                              password: data.password,
                              creditAmountUsed: data.creditAmountUsed,
                              productDetails: isCartMode 
                                ? cartItems.map(item => ({ id: item.productId, name: item.name }))
                                : [{ id: productId, name: product?.name }],
                            },
                          });
                          if (error) throw error;
                          console.log('[Checkout] Free credit checkout completed', result);
                        } catch (err: any) {
                          console.error('[Checkout] Free credit checkout failed:', err);
                          throw err;
                        }
                      }}
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
                        couponDiscount={couponDiscount}
                        amount={priceAfterCoupon}
                        currency={currency}
                        productType={product?.product_type || cartItems[0]?.productType}
                        trialAmount={geoTrialAmount}
                        onSuccess={handleSuccess}
                        disabled={!user && (!email || !password || password.length < 8)}
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
    <Elements 
      stripe={stripePromise} 
      key={pk}
      options={{
        appearance: { theme: 'stripe' },
        // Disable Link (save payment info) feature
        loader: 'auto',
      }}
    >
      <CheckoutContent />
    </Elements>
  );
}
