-- Add pay-what-you-feel (PWYF) pricing fields to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS pwyf_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pwyf_min_price_usd numeric,
ADD COLUMN IF NOT EXISTS pwyf_max_price_usd numeric,
ADD COLUMN IF NOT EXISTS pwyf_suggested_price_usd numeric;

-- Add comment explaining the fields
COMMENT ON COLUMN public.products.pwyf_enabled IS 'Enable pay-what-you-feel pricing for this product';
COMMENT ON COLUMN public.products.pwyf_min_price_usd IS 'Minimum price in USD for PWYF';
COMMENT ON COLUMN public.products.pwyf_max_price_usd IS 'Maximum price in USD for PWYF';
COMMENT ON COLUMN public.products.pwyf_suggested_price_usd IS 'Suggested/default price in USD for PWYF';