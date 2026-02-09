import { useParams, useNavigate } from 'react-router-dom';
import { useLesson } from '@/hooks/useLessons';
import { useCreateBookingRequest } from '@/hooks/useBookings';
import { useAuth } from '@/contexts/AuthContext';
import { BookingCalendar } from '@/components/lessons/BookingCalendar';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { sendBookingNotification } from '@/lib/bookingIntegrations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, DollarSign, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: lesson, isLoading } = useLesson(id);
  const createBooking = useCreateBookingRequest();

  const handleSlotsConfirmed = async (slots: { start: Date; end: Date }[]) => {
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(`/lessons/${id}`));
      return;
    }
    if (!lesson) return;

    try {
      const result = await createBooking.mutateAsync({
        lessonId: lesson.id,
        slots: slots.map(s => ({ start: s.start, end: s.end })),
      });
      // Send DM notification to tutor
      if (result?.id) {
        sendBookingNotification(result.id, 'new_request');
      }
      toast.success('Booking request sent! The tutor will review your proposed times.');
      navigate('/lessons');
    } catch {
      toast.error('Failed to send booking request');
    }
  };

  const formatPrice = () => {
    if (!lesson?.price || lesson.price === 0) return 'Free';
    const symbol = lesson.currency === 'GBP' ? '£' : lesson.currency === 'EUR' ? '€' : '$';
    return `${symbol}${lesson.price}`;
  };

  if (isLoading) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </>
    );
  }

  if (!lesson) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Lesson not found</p>
        </div>
      </>
    );
  }

  const tutor = lesson.tutor;
  const isOwnLesson = user?.id === lesson.tutor_id;

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Lesson Info Card */}
          <Card className="overflow-hidden">
            {lesson.image_url && (
              <div className="aspect-[21/9] overflow-hidden">
                <img
                  src={lesson.image_url}
                  alt={lesson.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-bold">{lesson.title}</h1>
                  {tutor && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={tutor.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {tutor.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{tutor.full_name || 'Tutor'}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {lesson.duration_minutes} min
                  </Badge>
                  <Badge className="text-base font-semibold px-3 py-1">
                    {formatPrice()}
                  </Badge>
                </div>
              </div>

              {lesson.description && (
                <p className="text-muted-foreground leading-relaxed">{lesson.description}</p>
              )}

              {/* Booking flow info */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Propose times</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Tutor confirms</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Pay after confirmation</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Calendar - only for students (not for the tutor viewing their own lesson) */}
          {!isOwnLesson && (
            <BookingCalendar
              tutorId={lesson.tutor_id}
              lessonDurationMinutes={lesson.duration_minutes}
              onSlotsConfirmed={handleSlotsConfirmed}
            />
          )}

          {isOwnLesson && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>This is your lesson. Students will see the booking calendar here.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
