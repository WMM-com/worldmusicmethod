import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLessons } from '@/hooks/useLessons';
import { LessonCard } from '@/components/lessons/LessonCard';
import { StudentBookingsList } from '@/components/lessons/StudentBookingsList';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { sendBookingConfirmation, createBookingRoom, sendBookingNotification } from '@/lib/bookingIntegrations';
import { useAuth } from '@/contexts/AuthContext';

export default function Lessons() {
  const { data: lessons, isLoading } = useLessons();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle payment success redirect
  useEffect(() => {
    const bookingId = searchParams.get('booking');
    const paymentStatus = searchParams.get('payment');

    if (bookingId && paymentStatus === 'success') {
      // Clean URL
      setSearchParams({});

      // Update booking to confirmed, create room, send confirmation
      (async () => {
        try {
          await supabase
            .from('booking_requests')
            .update({ status: 'confirmed' })
            .eq('id', bookingId);

          // Create video room for the lesson
          await createBookingRoom(bookingId);

          // Send confirmation email with .ics
          await sendBookingConfirmation(bookingId);

          // Notify tutor
          await sendBookingNotification(bookingId, 'confirmed');

          toast.success('Payment successful! Your lesson is confirmed. Check your email for details.');
        } catch (err) {
          console.error('Post-payment processing error:', err);
          toast.success('Payment received! Your lesson is being confirmed.');
        }
      })();
    }
  }, [searchParams, setSearchParams]);

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
          {/* Student's bookings */}
          {user && (
            <div>
              <h2 className="text-xl font-semibold mb-4">My Bookings</h2>
              <StudentBookingsList />
            </div>
          )}

          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <GraduationCap className="h-8 w-8" />
                Private Lessons
              </h1>
              <p className="text-muted-foreground mt-1">
                Book one-on-one lessons with expert tutors
              </p>
            </div>

            {isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-72 rounded-2xl" />
                ))}
              </div>
            ) : lessons?.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {lessons.map((lesson, i) => (
                  <LessonCard key={lesson.id} lesson={lesson} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No lessons available yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
