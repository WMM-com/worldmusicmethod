-- Add stripe_price_id column to products table
ALTER TABLE public.products 
ADD COLUMN stripe_price_id TEXT;

-- Add price_type column for distinguishing pricing models
ALTER TABLE public.products
ADD COLUMN price_type TEXT DEFAULT 'fixed';

-- Add comment for clarity
COMMENT ON COLUMN public.products.stripe_price_id IS 'Stripe recurring price ID for subscription products';
COMMENT ON COLUMN public.products.price_type IS 'Pricing model: fixed, pwyf, pwyf_subscription';