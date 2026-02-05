-- Create digital_products table for selling digital files
CREATE TABLE public.digital_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  price_type TEXT NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'pwyw')),
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_price NUMERIC(10,2) DEFAULT 0,
  geo_pricing JSONB DEFAULT '{}',
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;

-- Sellers can manage their own products
CREATE POLICY "Sellers can manage their own products"
  ON public.digital_products
  FOR ALL
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Anyone can view active products
CREATE POLICY "Anyone can view active products"
  ON public.digital_products
  FOR SELECT
  USING (is_active = true);

-- Create index for seller lookup
CREATE INDEX idx_digital_products_seller ON public.digital_products(seller_id);
CREATE INDEX idx_digital_products_active ON public.digital_products(is_active) WHERE is_active = true;

-- Auto-update updated_at
CREATE TRIGGER update_digital_products_updated_at
  BEFORE UPDATE ON public.digital_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();