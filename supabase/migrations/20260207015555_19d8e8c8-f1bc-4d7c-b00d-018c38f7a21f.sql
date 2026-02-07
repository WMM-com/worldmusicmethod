
-- =============================================
-- Merch Gigs (sales sessions) & Merch Sales
-- =============================================

-- Gigs / sales sessions
CREATE TABLE public.merch_gigs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  venue TEXT,
  location TEXT,
  gig_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual sale records
CREATE TABLE public.merch_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gig_id UUID REFERENCES public.merch_gigs(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.merch_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.merch_product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  buyer_name TEXT,
  buyer_email TEXT,
  notes TEXT,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_merch_gigs_user_id ON public.merch_gigs(user_id);
CREATE INDEX idx_merch_gigs_status ON public.merch_gigs(status);
CREATE INDEX idx_merch_gigs_date ON public.merch_gigs(gig_date);
CREATE INDEX idx_merch_sales_user_id ON public.merch_sales(user_id);
CREATE INDEX idx_merch_sales_gig_id ON public.merch_sales(gig_id);
CREATE INDEX idx_merch_sales_product_id ON public.merch_sales(product_id);

-- Auto-update updated_at
CREATE TRIGGER update_merch_gigs_updated_at
  BEFORE UPDATE ON public.merch_gigs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.merch_gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merch_sales ENABLE ROW LEVEL SECURITY;

-- merch_gigs: owners CRUD their own
CREATE POLICY "Users can view their own gigs"
  ON public.merch_gigs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own gigs"
  ON public.merch_gigs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gigs"
  ON public.merch_gigs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gigs"
  ON public.merch_gigs FOR DELETE
  USING (auth.uid() = user_id);

-- merch_sales: owners CRUD their own
CREATE POLICY "Users can view their own sales"
  ON public.merch_sales FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sales"
  ON public.merch_sales FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales"
  ON public.merch_sales FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales"
  ON public.merch_sales FOR DELETE
  USING (auth.uid() = user_id);
