
-- =============================================
-- Merchandise Products & Variants
-- =============================================

-- Main merch products table
CREATE TABLE public.merch_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  image_url TEXT,
  sku TEXT,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  cost_price NUMERIC(10,2),
  track_inventory BOOLEAN NOT NULL DEFAULT false,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  weight_grams INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product variants (size, colour, etc.)
CREATE TABLE public.merch_product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.merch_products(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL,       -- e.g. "Size", "Colour"
  variant_value TEXT NOT NULL,       -- e.g. "M", "Red"
  sku_suffix TEXT,
  price_override NUMERIC(10,2),     -- null = use product base_price
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_merch_products_user_id ON public.merch_products(user_id);
CREATE INDEX idx_merch_products_category ON public.merch_products(category);
CREATE INDEX idx_merch_products_active ON public.merch_products(is_active);
CREATE INDEX idx_merch_product_variants_product ON public.merch_product_variants(product_id);

-- Auto-update updated_at trigger
CREATE TRIGGER update_merch_products_updated_at
  BEFORE UPDATE ON public.merch_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.merch_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merch_product_variants ENABLE ROW LEVEL SECURITY;

-- merch_products: owners can CRUD their own
CREATE POLICY "Users can view their own merch products"
  ON public.merch_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view active merch products"
  ON public.merch_products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can create their own merch products"
  ON public.merch_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own merch products"
  ON public.merch_products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own merch products"
  ON public.merch_products FOR DELETE
  USING (auth.uid() = user_id);

-- merch_product_variants: access via product ownership
CREATE POLICY "Users can view variants of their own products"
  ON public.merch_product_variants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.merch_products mp
    WHERE mp.id = product_id AND mp.user_id = auth.uid()
  ));

CREATE POLICY "Public can view variants of active products"
  ON public.merch_product_variants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.merch_products mp
    WHERE mp.id = product_id AND mp.is_active = true
  ) AND is_active = true);

CREATE POLICY "Users can create variants for their own products"
  ON public.merch_product_variants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.merch_products mp
    WHERE mp.id = product_id AND mp.user_id = auth.uid()
  ));

CREATE POLICY "Users can update variants of their own products"
  ON public.merch_product_variants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.merch_products mp
    WHERE mp.id = product_id AND mp.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete variants of their own products"
  ON public.merch_product_variants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.merch_products mp
    WHERE mp.id = product_id AND mp.user_id = auth.uid()
  ));
