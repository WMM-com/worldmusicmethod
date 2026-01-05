-- Create coupons table for managing discount codes
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT,
  description TEXT,
  
  -- Discount type: 'percentage' or 'fixed'
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  
  -- For percentage discounts (0-100)
  percent_off NUMERIC CHECK (percent_off IS NULL OR (percent_off > 0 AND percent_off <= 100)),
  
  -- For fixed amount discounts (in cents/minor currency units)
  amount_off NUMERIC CHECK (amount_off IS NULL OR amount_off > 0),
  
  -- Currency for fixed discounts
  currency TEXT DEFAULT 'USD',
  
  -- Duration: 'once', 'repeating', 'forever'
  duration TEXT NOT NULL DEFAULT 'once' CHECK (duration IN ('once', 'repeating', 'forever')),
  
  -- For repeating duration, number of months
  duration_in_months INTEGER,
  
  -- Usage limits
  max_redemptions INTEGER,
  times_redeemed INTEGER DEFAULT 0,
  
  -- Validity dates
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  
  -- What products/subscriptions it applies to (null = all)
  applies_to_products UUID[],
  applies_to_subscriptions BOOLEAN DEFAULT true,
  applies_to_one_time BOOLEAN DEFAULT true,
  
  -- Stripe coupon ID (synced with Stripe)
  stripe_coupon_id TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can manage coupons" ON public.coupons
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Allow authenticated users to read active coupons (for validation at checkout)
CREATE POLICY "Users can read active coupons" ON public.coupons
FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add constraint to ensure either percent_off or amount_off is set based on discount_type
ALTER TABLE public.coupons ADD CONSTRAINT check_discount_value 
  CHECK (
    (discount_type = 'percentage' AND percent_off IS NOT NULL AND amount_off IS NULL) OR
    (discount_type = 'fixed' AND amount_off IS NOT NULL AND percent_off IS NULL)
  );