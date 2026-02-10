import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMyBookingRequests } from '@/hooks/useBookings';
import { createLessonPayment } from '@/lib/bookingIntegrations';
import { CreditCard, Video, Clock, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, FileText, CalendarX, Star } from 'lucide-react';
import { formatLocalTimeRange } from '@/lib/timezone';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CancelRescheduleDialog } from './CancelRescheduleDialog';
import { LessonNotesPanel } from './LessonNotesPanel';
import { LessonRatingForm } from './LessonRatingForm';

const STATUS_LABELS: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: 'Pending Review', icon: Clock, className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  tutor_reviewed: { label: 'Tutor Reviewed', icon: CheckCircle, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  payment_pending: { label: 'Payment Required', icon: CreditCard, className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  completed: { label: 'Completed', icon: CheckCircle, className: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
};

export function StudentBookingsList() {
  const { data: bookings, isLoading } = useMyBookingRequests();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [tutorProviders, setTutorProviders] = useState<Record<string, string[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; bookingId: string; policyHours: number; slotStart: string | null; allowReschedule: boolean }>({
    open: false, bookingId: '', policyHours: 24, slotStart: null, allowReschedule: true,
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!bookings?.length) return;
    const tutorIds = [...new Set(bookings.filter(b => b.status === 'payment_pending').map(b => b.lesson?.tutor_id).filter(Boolean))];
    if (!tutorIds.length) return;
    supabase
      .from('payment_accounts')
      .select('user_id, provider')
      .in('user_id', tutorIds)
      .eq('onboarding_complete', true)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string[]> = {};
        data.forEach(a => {
          if (!map[a.user_id]) map[a.user_id] = [];
          map[a.user_id].push(a.provider);
        });
        setTutorProviders(map);
      });
  }, [bookings]);

  const handlePay = async (bookingId: string, provider?: 'stripe' | 'flutterwave') => {
    setPayingId(bookingId);
    try {
      const result = await createLessonPayment(bookingId, provider);
      if (result?.free) { toast.success('Free lesson confirmed!'); return; }
      if (result?.url) { window.open(result.url, '_blank'); } else { toast.error('Failed to create payment session'); }
    } catch { toast.error('Payment failed'); } finally { setPayingId(null); }
  };

  const handleJoinRoom = async (videoRoomId: string) => {
    const { data: room } = await supabase.from('video_rooms').select('room_name').eq('id', videoRoomId).single();
    if (room) navigate(`/meet/${room.room_name}`);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading bookings...</p>;

  if (!bookings?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>No bookings yet.</p>
        <p className="text-sm mt-1">Browse lessons and book a session with a tutor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map(booking => {
        const lesson = booking.lesson;
        const status = STATUS_LABELS[booking.status] || STATUS_LABELS.pending;
        const StatusIcon = status.icon;
        const confirmedSlot = booking.slots?.find(s => s.status === 'selected_by_tutor');
        const isExpanded = expandedId === booking.id;
        const canCancel = ['pending', 'tutor_reviewed', 'payment_pending', 'confirmed'].includes(booking.status);
        const allowReschedule = (lesson as any)?.allow_rescheduling ?? true;
        const policyHours = (lesson as any)?.cancellation_policy_hours || 24;

        return (
          <Card key={booking.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{lesson?.title || 'Lesson'}</p>
                  {confirmedSlot && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatLocalTimeRange(confirmedSlot.start_time, confirmedSlot.end_time)}
                    </p>
                  )}
                  {/* Series indicator */}
                  {(booking as any).series_id && (
                    <Badge variant="outline" className="text-xs mt-1">Series #{(booking as any).series_index || 1}</Badge>
                  )}
                </div>
                <Badge className={`shrink-0 text-xs gap-1 ${status.className}`}>
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>

              {/* Proposed times */}
              {booking.status === 'pending' && booking.slots && booking.slots.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {booking.slots.length} time{booking.slots.length > 1 ? 's' : ''} proposed – awaiting tutor review
                </div>
              )}

              {/* Pay button */}
              {booking.status === 'payment_pending' && (() => {
                const providers = tutorProviders[lesson?.tutor_id] || [];
                const hasStripe = providers.includes('stripe');
                const hasFlutterwave = providers.includes('flutterwave');
                const hasBoth = hasStripe && hasFlutterwave;
                const priceLabel = `${lesson?.currency === 'GBP' ? '£' : lesson?.currency === 'EUR' ? '€' : '$'}${lesson?.price}`;

                if (payingId === booking.id) {
                  return <Button size="sm" className="w-full" disabled><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Processing...</Button>;
                }
                if (hasBoth) {
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="w-full"><CreditCard className="h-3.5 w-3.5 mr-1" /> Pay Now – {priceLabel}<ChevronDown className="h-3 w-3 ml-1" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePay(booking.id, 'stripe')}>Pay with Stripe</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePay(booking.id, 'flutterwave')}>Pay with Flutterwave</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }
                return (
                  <Button size="sm" className="w-full" onClick={() => handlePay(booking.id, hasFlutterwave ? 'flutterwave' : 'stripe')}>
                    <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay Now – {priceLabel}
                  </Button>
                );
              })()}

              {/* Join video room */}
              {booking.status === 'confirmed' && (booking as any).video_room_id && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleJoinRoom((booking as any).video_room_id)}>
                  <Video className="h-3.5 w-3.5 mr-1" /> Join Video Room
                </Button>
              )}

              {/* Cancel / Reschedule for active bookings */}
              {canCancel && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-destructive flex-1"
                    onClick={() => setCancelDialog({
                      open: true,
                      bookingId: booking.id,
                      policyHours,
                      slotStart: confirmedSlot?.start_time || null,
                      allowReschedule,
                    })}
                  >
                    <CalendarX className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                </div>
              )}

              {/* Cancelled info */}
              {booking.status === 'cancelled' && (booking as any).cancellation_reason && (
                <p className="text-xs text-muted-foreground italic">Reason: {(booking as any).cancellation_reason}</p>
              )}

              {/* Completed: show rating + notes */}
              {booking.status === 'completed' && (
                <div className="space-y-2">
                  <LessonRatingForm
                    bookingRequestId={booking.id}
                    tutorId={lesson?.tutor_id || ''}
                    lessonId={lesson?.id || ''}
                  />
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 w-full" onClick={() => setExpandedId(isExpanded ? null : booking.id)}>
                    <FileText className="h-3 w-3" /> Notes
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                  {isExpanded && <LessonNotesPanel bookingRequestId={booking.id} />}
                </div>
              )}

              {/* Confirmed: show notes */}
              {booking.status === 'confirmed' && (
                <div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 w-full" onClick={() => setExpandedId(isExpanded ? null : booking.id)}>
                    <FileText className="h-3 w-3" /> View Notes
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                  {isExpanded && <div className="mt-2"><LessonNotesPanel bookingRequestId={booking.id} /></div>}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <CancelRescheduleDialog
        open={cancelDialog.open}
        onOpenChange={open => setCancelDialog(prev => ({ ...prev, open }))}
        bookingId={cancelDialog.bookingId}
        mode="cancel"
        cancelledBy="student"
        cancellationPolicyHours={cancelDialog.policyHours}
        confirmedSlotStart={cancelDialog.slotStart}
      />
    </div>
  );
}
