-- Add percentage_of_revenue column to revenue_pool_settings
-- This allows admin to set what % of Beta membership revenue goes to artists
ALTER TABLE public.revenue_pool_settings 
ADD COLUMN IF NOT EXISTS percentage_of_revenue numeric DEFAULT 50 CHECK (percentage_of_revenue >= 0 AND percentage_of_revenue <= 100);

-- Add columns for multi-currency support (GBP, USD, EUR)
ALTER TABLE public.revenue_pool_settings 
ADD COLUMN IF NOT EXISTS pool_amount_usd numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pool_amount_eur numeric DEFAULT 0;

-- Rename existing pool_amount to pool_amount_gbp for clarity
-- First add the new column, copy data, then we'll use both
ALTER TABLE public.revenue_pool_settings 
ADD COLUMN IF NOT EXISTS pool_amount_gbp numeric DEFAULT 0;

-- Copy existing pool_amount to pool_amount_gbp if currency was GBP
UPDATE public.revenue_pool_settings 
SET pool_amount_gbp = pool_amount 
WHERE currency = 'GBP' OR currency IS NULL;

UPDATE public.revenue_pool_settings 
SET pool_amount_usd = pool_amount 
WHERE currency = 'USD';

UPDATE public.revenue_pool_settings 
SET pool_amount_eur = pool_amount 
WHERE currency = 'EUR';