-- Create table for PayPal pending order metadata (to work around 127 char custom_id limit)
CREATE TABLE public.paypal_pending_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_ids TEXT[] NOT NULL,
  product_details JSONB NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  coupon_code TEXT,
  currency TEXT DEFAULT 'USD',
  total_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  captured_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.paypal_pending_orders ENABLE ROW LEVEL SECURITY;

-- Allow edge functions (service role) full access - no user-facing policies needed
CREATE POLICY "Service role can manage pending orders"
  ON public.paypal_pending_orders
  FOR ALL
  USING (true)
  WITH CHECK (true);