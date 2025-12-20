import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, CreditCard, Loader2, Tag, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useGeoPricing, formatPrice } from '@/hooks/useGeoPricing';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Checkout() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);
  
  // Account creation state (for guests)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Returning customer login
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  
  const { region, isLoading: geoLoading, calculatePrice } = useGeoPricing();

  // Fetch product details
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

  const handleCheckout = async () => {
    // If not logged in, create account first
    if (!user) {
      if (!email || !password) {
        toast.error('Please enter your email and password');
        return;
      }
      
      if (isReturningCustomer) {
        // Login existing user
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          toast.error(error.message || 'Login failed');
          return;
        }
      } else {
        // Create new account
        if (!firstName || !lastName) {
          toast.error('Please enter your name');
          return;
        }
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/payment-success`,
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Email already registered. Click "Returning customer?" to sign in.');
            setIsReturningCustomer(true);
          } else {
            toast.error(error.message || 'Account creation failed');
          }
          return;
        }
      }
    }

    setIsProcessing(true);
    try {
      const priceInfo = calculatePrice(product?.base_price_usd || 0);
      
      const { data, error } = await supabase.functions.invoke('create-course-checkout', {
        body: {
          productId: product?.id,
          courseId: product?.course_id,
          region,
          priceAmount: Math.round(priceInfo.price * 100),
          currency: priceInfo.currency.toLowerCase(),
          couponCode: appliedCoupon?.code,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setIsProcessing(false);
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

  if (!product) {
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

  const priceInfo = calculatePrice(product.base_price_usd);
  const isCourse = product.product_type === 'course';

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
                className="text-sm text-primary hover:underline"
              >
                Click here to login
              </button>
            </div>
          )}

          {/* Coupon toggle */}
          {!showCouponInput && !appliedCoupon && (
            <div className="mb-6">
              <button 
                onClick={() => setShowCouponInput(true)}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <Tag className="h-4 w-4" />
                Have a coupon? Click here to enter your code
              </button>
            </div>
          )}

          {/* Coupon input */}
          {showCouponInput && !appliedCoupon && (
            <Card className="p-4 mb-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={handleApplyCoupon}
                  disabled={isValidatingCoupon || !couponCode.trim()}
                >
                  {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowCouponInput(false)}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {/* Applied coupon */}
          {appliedCoupon && (
            <Card className="p-4 mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Coupon {appliedCoupon.code} applied
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                  Remove
                </Button>
              </div>
            </Card>
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
                        className="text-sm text-primary hover:underline"
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
                {/* Product row */}
                <div className="flex justify-between items-start pb-4 border-b border-border">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground uppercase mb-2">Product</p>
                    <p className="font-medium">{product.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground uppercase mb-2">Total</p>
                    <p className="font-semibold">{formatPrice(priceInfo.price, priceInfo.currency)}</p>
                  </div>
                </div>

                {/* Subtotal & Total */}
                <div className="py-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(priceInfo.price, priceInfo.currency)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Coupon: {appliedCoupon.code}</span>
                      <span className="text-green-600">Applied at checkout</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t border-border">
                    <span>Total</span>
                    <span>{formatPrice(priceInfo.price, priceInfo.currency)}</span>
                  </div>
                </div>

                {/* Payment methods info */}
                <div className="py-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Credit/Debit Cards</span>
                    <div className="flex gap-1 ml-auto">
                      <div className="w-8 h-5 bg-[#1A1F71] rounded text-white text-[8px] flex items-center justify-center font-bold">VISA</div>
                      <div className="w-8 h-5 bg-[#EB001B] rounded text-white text-[8px] flex items-center justify-center font-bold">MC</div>
                      <div className="w-8 h-5 bg-[#006FCF] rounded text-white text-[8px] flex items-center justify-center font-bold">AMEX</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pay securely with Stripe. Apple Pay & Google Pay also supported.
                  </p>
                </div>

                {/* Checkout button */}
                <Button 
                  size="lg" 
                  className="w-full mt-4"
                  onClick={handleCheckout}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Complete Purchase'
                  )}
                </Button>

                {/* Security & guarantee */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Secure checkout powered by Stripe</span>
                  </div>
                  
                  {isCourse && (
                    <p className="text-center text-sm text-green-600 font-medium">
                      30-Day 110% Money Back Guarantee
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
