-- Add send_to_all column to email_campaigns
ALTER TABLE public.email_campaigns
ADD COLUMN send_to_all boolean DEFAULT false;