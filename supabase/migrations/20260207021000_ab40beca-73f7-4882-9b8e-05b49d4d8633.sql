-- Add stripe_location_id to merch_gigs for Terminal Location mapping
ALTER TABLE public.merch_gigs
ADD COLUMN stripe_location_id TEXT;

-- Add payment_source to merch_sales to distinguish web/terminal/cash
ALTER TABLE public.merch_sales
ADD COLUMN payment_source TEXT NOT NULL DEFAULT 'web';

-- Add index for location lookup from webhook
CREATE INDEX idx_merch_gigs_stripe_location ON public.merch_gigs(stripe_location_id) WHERE stripe_location_id IS NOT NULL;