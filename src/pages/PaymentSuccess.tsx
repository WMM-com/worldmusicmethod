import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useAuth } from '@/contexts/AuthContext';
import confetti from 'canvas-confetti';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const courseId = searchParams.get('course_id');

  useEffect(() => {
    // Celebrate with confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

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
