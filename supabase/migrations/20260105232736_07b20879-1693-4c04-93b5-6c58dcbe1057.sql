-- Add original_amount and coupon_discount columns to paypal_pending_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'paypal_pending_orders' AND column_name = 'original_amount'
  ) THEN
    ALTER TABLE public.paypal_pending_orders ADD COLUMN original_amount NUMERIC;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'paypal_pending_orders' AND column_name = 'coupon_discount'
  ) THEN
    ALTER TABLE public.paypal_pending_orders ADD COLUMN coupon_discount NUMERIC DEFAULT 0;
  END IF;
END $$;