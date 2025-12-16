-- Add custom_fee column to shared_events for showing a different fee amount
ALTER TABLE public.shared_events ADD COLUMN custom_fee numeric DEFAULT NULL;