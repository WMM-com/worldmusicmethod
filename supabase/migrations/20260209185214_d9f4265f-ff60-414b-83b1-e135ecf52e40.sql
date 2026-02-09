
-- Add optional year column to merch_products for album/release year
ALTER TABLE public.merch_products
ADD COLUMN year INTEGER;
