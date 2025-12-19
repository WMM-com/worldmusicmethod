import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Globe, CreditCard, CheckCircle, Loader2, Tag, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  
  // Guest checkout state
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const { region, countryName, isLoading: geoLoading, calculatePrice } = useGeoPricing();

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
      // For now, we'll pass the coupon to Stripe - it will validate it
      // In a real app, you might want to validate coupons server-side first
      setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discount: 0 });
      toast.success('Coupon will be applied at checkout');
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

  const handleGuestAuth = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsAuthenticating(true);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/payment-success`,
          },
        });
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Email already registered. Please sign in instead.');
            setAuthMode('login');
          } else {
            throw error;
          }
          return;
        }
        toast.success('Account created! Proceeding to checkout...');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Signed in! Proceeding to checkout...');
      }
      
      // After successful auth, the user state will update and checkout will proceed
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please sign in or create an account first');
      return;
    }

    setIsProcessing(true);
    try {
      const priceInfo = calculatePrice(product?.base_price_usd || 0);
      
      const { data, error } = await supabase.functions.invoke('create-course-checkout', {
        body: {
          productId: product?.id,
          courseId: product?.course_id,
          region,
          priceAmount: Math.round(priceInfo.price * 100), // Convert to cents
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

  const course = product.courses as any;
  const priceInfo = calculatePrice(product.base_price_usd);
  const originalPrice = product.base_price_usd;

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background py-12">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-2 gap-8"
          >
            {/* Product summary */}
            <div>
              <h1 className="text-2xl font-bold mb-6">Complete Your Purchase</h1>
              
              <Card className="p-6 mb-6">
                {course?.cover_image_url ? (
                  <img 
                    src={course.cover_image_url} 
                    alt={product.name}
                    className="w-full aspect-video object-cover rounded-lg mb-4"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg mb-4" />
                )}
                
                <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
                {product.description && (
                  <p className="text-muted-foreground mb-4">{product.description}</p>
                )}
                
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-3">What's included:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Lifetime access to all course content
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Interactive lessons with Soundslice
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Practice tools and ear training
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Access to student community
                    </li>
                  </ul>
                </div>
              </Card>

              {/* Guest checkout / Login */}
              {!user && (
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Create Account or Sign In</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create an account to access your course after purchase.
                  </p>
                  
                  <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'signup')}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="signup">Create Account</TabsTrigger>
                      <TabsTrigger value="login">Sign In</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="signup" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                        className="w-full" 
                        onClick={handleGuestAuth}
                        disabled={isAuthenticating}
                      >
                        {isAuthenticating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          'Create Account & Continue'
                        )}
                      </Button>
                    </TabsContent>
                    
                    <TabsContent value="login" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                        className="w-full" 
                        onClick={handleGuestAuth}
                        disabled={isAuthenticating}
                      >
                        {isAuthenticating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Sign In & Continue'
                        )}
                      </Button>
                    </TabsContent>
                  </Tabs>
                </Card>
              )}
            </div>

            {/* Payment summary */}
            <div>
              <Card className="p-6 sticky top-6">
                {/* Region detection */}
                <div className="flex items-center gap-2 mb-6 p-3 bg-muted/50 rounded-lg">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {countryName ? (
                      <>Pricing for <strong>{countryName}</strong></>
                    ) : (
                      'Regional pricing applied'
                    )}
                  </span>
                  {priceInfo.discount_percentage > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {priceInfo.discount_percentage}% off
                    </Badge>
                  )}
                </div>

                {/* Coupon code input */}
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-2 block">Coupon Code</Label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          {appliedCoupon.code}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                        Remove
                      </Button>
                    </div>
                  ) : (
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
                    </div>
                  )}
                </div>

                {/* Price breakdown */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Original price</span>
                    <span className={priceInfo.discount_percentage > 0 ? 'line-through text-muted-foreground' : ''}>
                      ${originalPrice.toFixed(2)} USD
                    </span>
                  </div>
                  
                  {priceInfo.discount_percentage > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Regional discount</span>
                      <span className="text-green-600">-{priceInfo.discount_percentage}%</span>
                    </div>
                  )}
                  
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Coupon ({appliedCoupon.code})</span>
                      <span className="text-green-600">Applied at checkout</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total</span>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {formatPrice(priceInfo.price, priceInfo.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {priceInfo.currency}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checkout button */}
                <Button 
                  size="lg" 
                  className="w-full gap-2"
                  onClick={handleCheckout}
                  disabled={isProcessing || !user}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      {user ? 'Proceed to Payment' : 'Sign in first to purchase'}
                    </>
                  )}
                </Button>

                {/* Security notice */}
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Secure checkout powered by Stripe</span>
                </div>

                {/* Payment methods note */}
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Card payments • Apple Pay • Google Pay
                </p>

                {/* Money back guarantee */}
                <p className="text-center text-sm text-green-600 mt-4 font-medium">
                  30-day 110% money-back guarantee
                </p>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}