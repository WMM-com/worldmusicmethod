-- Add fixed_price column to product_regional_pricing for exact price overrides
ALTER TABLE public.product_regional_pricing 
ADD COLUMN fixed_price numeric NULL;

-- Add a comment explaining the logic
COMMENT ON COLUMN public.product_regional_pricing.fixed_price IS 'If set, this exact price is used instead of calculating from discount_percentage';