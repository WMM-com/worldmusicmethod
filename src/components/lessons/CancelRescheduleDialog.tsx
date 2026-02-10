import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { useUpdateBookingStatus } from '@/hooks/useBookings';
import { sendBookingNotification } from '@/lib/bookingIntegrations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CancelRescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  mode: 'cancel' | 'reschedule';
  cancelledBy: 'student' | 'tutor';
  cancellationPolicyHours?: number;
  confirmedSlotStart?: string | null;
}

export function CancelRescheduleDialog({
  open,
  onOpenChange,
  bookingId,
  mode,
  cancelledBy,
  cancellationPolicyHours = 24,
  confirmedSlotStart,
}: CancelRescheduleDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const updateStatus = useUpdateBookingStatus();

  const isWithinPolicy = confirmedSlotStart
    ? (new Date(confirmedSlotStart).getTime() - Date.now()) / (1000 * 60 * 60) < cancellationPolicyHours
    : false;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      // Update booking_requests with cancellation details
      const { error } = await supabase
        .from('booking_requests')
        .update({
          status: 'cancelled',
          cancelled_by: cancelledBy,
          cancellation_reason: reason.trim() || null,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', bookingId);
      if (error) throw error;

      sendBookingNotification(bookingId, 'cancelled');
      toast.success(mode === 'cancel' ? 'Booking cancelled' : 'Booking cancelled for rescheduling');
      onOpenChange(false);
    } catch {
      toast.error('Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {mode === 'cancel' ? 'Cancel Booking' : 'Reschedule Booking'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'cancel'
              ? 'This will cancel the booking and notify the other party.'
              : 'This will cancel the current booking. You can then create a new booking with updated times.'}
          </DialogDescription>
        </DialogHeader>

        {isWithinPolicy && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              ⚠️ Within {cancellationPolicyHours}h cancellation window
            </p>
            <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">
              This lesson starts within the tutor's cancellation policy window. Cancellation may not include a refund.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Reason (optional)</Label>
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Let the other party know why..."
            rows={3}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Keep Booking
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Processing...' : mode === 'cancel' ? 'Cancel Booking' : 'Cancel & Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
