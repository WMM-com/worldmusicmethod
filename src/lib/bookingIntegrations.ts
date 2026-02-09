import { supabase } from '@/integrations/supabase/client';

type NotificationType = 'new_request' | 'tutor_reviewed' | 'payment_pending' | 'confirmed' | 'cancelled';

export async function sendBookingNotification(bookingRequestId: string, type: NotificationType) {
  try {
    const { error } = await supabase.functions.invoke('booking-notification', {
      body: { bookingRequestId, type },
    });
    if (error) console.error('[booking-notification] Error:', error);
  } catch (err) {
    console.error('[booking-notification] Failed:', err);
  }
}

export async function createLessonPayment(bookingRequestId: string, provider?: 'stripe' | 'flutterwave'): Promise<{ url?: string; free?: boolean; provider?: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke('create-lesson-payment', {
      body: { bookingRequestId, provider },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[create-lesson-payment] Failed:', err);
    return null;
  }
}

export async function createBookingRoom(bookingRequestId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('create-booking-room', {
      body: { bookingRequestId },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[create-booking-room] Failed:', err);
    return null;
  }
}

export async function sendBookingConfirmation(bookingRequestId: string) {
  try {
    const { error } = await supabase.functions.invoke('send-booking-confirmation', {
      body: { bookingRequestId },
    });
    if (error) console.error('[send-booking-confirmation] Error:', error);
  } catch (err) {
    console.error('[send-booking-confirmation] Failed:', err);
  }
}
