-- Table to track digital product purchases and download access
CREATE TABLE public.digital_product_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.digital_products(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id),
  buyer_email TEXT NOT NULL,
  seller_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_provider TEXT NOT NULL, -- 'stripe', 'flutterwave', 'paypal'
  provider_payment_id TEXT, -- Stripe session ID, Flutterwave tx_ref, PayPal order ID
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, refunded
  download_token UUID DEFAULT gen_random_uuid(),
  download_expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(product_id, provider_payment_id)
);

-- Enable RLS
ALTER TABLE public.digital_product_purchases ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own purchases
CREATE POLICY "Buyers can view own purchases"
ON public.digital_product_purchases FOR SELECT
USING (buyer_id = auth.uid());

-- Sellers can view purchases of their products
CREATE POLICY "Sellers can view sales"
ON public.digital_product_purchases FOR SELECT
USING (seller_id = auth.uid());

-- Service role can insert/update (for edge functions)
CREATE POLICY "Service role can insert purchases"
ON public.digital_product_purchases FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update purchases"
ON public.digital_product_purchases FOR UPDATE
USING (true);

-- Function to validate download token and get file URL
CREATE OR REPLACE FUNCTION public.validate_download_token(p_token UUID)
RETURNS TABLE (
  product_id UUID,
  file_url TEXT,
  title TEXT,
  can_download BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase RECORD;
BEGIN
  -- Find purchase by download token
  SELECT dpp.*, dp.file_url as product_file_url, dp.title as product_title
  INTO v_purchase
  FROM digital_product_purchases dpp
  JOIN digital_products dp ON dp.id = dpp.product_id
  WHERE dpp.download_token = p_token
    AND dpp.status = 'completed';

  IF v_purchase IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, false, 'Invalid or expired download link'::TEXT;
    RETURN;
  END IF;

  -- Check expiration
  IF v_purchase.download_expires_at < now() THEN
    RETURN QUERY SELECT v_purchase.product_id, NULL::TEXT, v_purchase.product_title, false, 'Download link has expired'::TEXT;
    RETURN;
  END IF;

  -- Check download limit
  IF v_purchase.download_count >= v_purchase.max_downloads THEN
    RETURN QUERY SELECT v_purchase.product_id, NULL::TEXT, v_purchase.product_title, false, 'Maximum downloads reached'::TEXT;
    RETURN;
  END IF;

  -- Increment download count
  UPDATE digital_product_purchases
  SET download_count = download_count + 1
  WHERE id = v_purchase.id;

  -- Return success
  RETURN QUERY SELECT v_purchase.product_id, v_purchase.product_file_url, v_purchase.product_title, true, 'OK'::TEXT;
END;
$$;