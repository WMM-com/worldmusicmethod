-- Add coupon_code column to orders table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'coupon_code'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN coupon_code TEXT;
  END IF;
  
  -- Add coupon_discount column to track the discount amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'coupon_discount'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN coupon_discount NUMERIC DEFAULT 0;
  END IF;
END $$;