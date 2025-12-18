import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Globe, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to purchase');
      navigate('/auth');
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
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      {user ? 'Proceed to Payment' : 'Sign in to Purchase'}
                    </>
                  )}
                </Button>

                {/* Security notice */}
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Secure checkout powered by Stripe</span>
                </div>

                {/* Money back guarantee */}
                <p className="text-center text-sm text-muted-foreground mt-4">
                  30-day money-back guarantee
                </p>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
