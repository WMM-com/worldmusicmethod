import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SiteHeader } from '@/components/layout/SiteHeader';

export default function PaymentCancelled() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product_id');

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="p-8 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-muted-foreground" />
            </div>

            <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
            <p className="text-muted-foreground mb-6">
              Your payment was not completed. No charges have been made to your account.
            </p>

            <div className="space-y-3">
              {productId && (
                <Button 
                  size="lg" 
                  className="w-full gap-2"
                  onClick={() => navigate(`/checkout/${productId}`)}
                >
                  <CreditCard className="w-4 h-4" />
                  Try Again
                </Button>
              )}

              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => navigate('/courses')}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Courses
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              Need help? Contact support@worldmusicmethod.com
            </p>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
