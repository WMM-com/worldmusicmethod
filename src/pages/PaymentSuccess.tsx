import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const courseId = searchParams.get('course_id');
  const method = searchParams.get('method');
  const paypalToken = searchParams.get('token'); // PayPal adds this to return URL
  const paypalPayerId = searchParams.get('PayerID'); // PayPal adds this when approved
  
  const [isProcessingPaypal, setIsProcessingPaypal] = useState(false);
  const [paypalProcessed, setPaypalProcessed] = useState(false);

  useEffect(() => {
    // Check if this is a PayPal popup return
    if (method === 'paypal' && paypalToken && window.opener) {
      // Send message to parent window with the token (order ID)
      window.opener.postMessage({ 
        type: 'paypal_success', 
        orderId: paypalToken,
        payerId: paypalPayerId 
      }, window.location.origin);
      
      // Store in sessionStorage as backup
      sessionStorage.setItem('paypal_success', JSON.stringify({ 
        orderId: paypalToken,
        payerId: paypalPayerId 
      }));
      
      // Close this popup window
      window.close();
      return;
    }

    // If PayPal return but NOT in a popup (user opened in same window somehow)
    // OR if this is the main window after PayPal approval, process the capture
    if (method === 'paypal' && paypalToken && !window.opener && !paypalProcessed) {
      setIsProcessingPaypal(true);
      
      // Capture the PayPal order directly
      supabase.functions.invoke('capture-paypal-order', {
        body: { orderId: paypalToken }
      }).then(({ error }) => {
        setIsProcessingPaypal(false);
        setPaypalProcessed(true);
        if (error) {
          console.error('PayPal capture failed:', error);
        } else {
          // Trigger confetti on success
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      });
      return;
    }

    // Regular success page - celebrate with confetti
    if (!isProcessingPaypal) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [method, paypalToken, paypalPayerId, paypalProcessed, isProcessingPaypal]);

  // Show loading state while processing PayPal
  if (isProcessingPaypal) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="p-8 text-center max-w-md w-full">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-xl font-bold mb-2">Processing Payment...</h1>
            <p className="text-muted-foreground">Please wait while we complete your PayPal payment.</p>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <Card className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-green-600" />
            </motion.div>

            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground mb-6">
              Thank you for your purchase. You now have full access to the course.
            </p>

            <div className="space-y-3">
              {courseId ? (
                <Button 
                  size="lg" 
                  className="w-full gap-2"
                  onClick={() => navigate(`/courses/${courseId}/learn`)}
                >
                  <BookOpen className="w-4 h-4" />
                  Start Learning
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  className="w-full gap-2"
                  onClick={() => navigate('/my-courses')}
                >
                  <BookOpen className="w-4 h-4" />
                  Go to My Courses
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/courses')}
              >
                Browse More Courses
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              A receipt has been sent to your email.
            </p>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
