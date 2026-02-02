-- Remove old PWYF columns
ALTER TABLE public.products 
DROP COLUMN IF EXISTS pwyf_enabled,
DROP COLUMN IF EXISTS pwyf_min_price_usd,
DROP COLUMN IF EXISTS pwyf_max_price_usd,
DROP COLUMN IF EXISTS pwyf_suggested_price_usd;

-- Add new PWYF columns with requested naming
ALTER TABLE public.products 
ADD COLUMN is_pwyf BOOLEAN DEFAULT false,
ADD COLUMN min_price NUMERIC DEFAULT 0,
ADD COLUMN max_price NUMERIC DEFAULT 0,
ADD COLUMN suggested_price NUMERIC DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.products.is_pwyf IS 'Whether this product uses Pay What You Feel pricing';
COMMENT ON COLUMN public.products.min_price IS 'Minimum price in USD (whole dollars)';
COMMENT ON COLUMN public.products.max_price IS 'Maximum price in USD (whole dollars)';
COMMENT ON COLUMN public.products.suggested_price IS 'Suggested/default price in USD (whole dollars)';