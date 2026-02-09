
-- Add reminder tracking columns to booking_requests
ALTER TABLE public.booking_requests 
ADD COLUMN confirmation_email_sent BOOLEAN DEFAULT false,
ADD COLUMN reminder_24h_sent BOOLEAN DEFAULT false,
ADD COLUMN reminder_1h_sent BOOLEAN DEFAULT false,
ADD COLUMN confirmed_slot_start TIMESTAMPTZ,
ADD COLUMN confirmed_slot_end TIMESTAMPTZ;

-- Index for reminder cron queries
CREATE INDEX idx_booking_reminders ON public.booking_requests(status, confirmed_slot_start) 
WHERE status = 'confirmed' AND confirmed_slot_start IS NOT NULL;
