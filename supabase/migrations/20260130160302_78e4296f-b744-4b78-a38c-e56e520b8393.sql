-- Add from_email column to track sender domain
ALTER TABLE public.email_send_log 
ADD COLUMN IF NOT EXISTS from_email text;

-- Add index for filtering by sender domain
CREATE INDEX IF NOT EXISTS idx_email_send_log_from_email ON public.email_send_log(from_email);

-- Enable realtime for email_send_log table
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_send_log;