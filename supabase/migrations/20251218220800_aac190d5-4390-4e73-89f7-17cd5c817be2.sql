-- Create pricing region enum
CREATE TYPE public.pricing_region AS ENUM (
  'africa',
  'south_america',
  'usa_canada',
  'uk',
  'north_west_europe',
  'east_south_europe',
  'asia_lower',
  'asia_higher',
  'default'
);

-- Create products table for digital products (courses, etc.)
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL DEFAULT 'course', -- 'course', 'bundle', 'subscription'
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  base_price_usd NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create regional pricing table
CREATE TABLE public.product_regional_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  region pricing_region NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  discount_percentage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, region)
);

-- Insert default regional pricing rules (will apply to all products)
-- These are template entries - actual pricing calculated at runtime

-- Create course enrollments table
CREATE TABLE public.course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  enrolled_by UUID, -- admin who enrolled them, null if self-enrolled
  enrollment_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'purchase', 'gift', 'trial'
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Create media gallery table
CREATE TABLE public.media_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video', 'audio', 'document'
  file_size INTEGER,
  mime_type TEXT,
  alt_text TEXT,
  folder TEXT DEFAULT 'uploads',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create country to region mapping table
CREATE TABLE public.country_region_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  region pricing_region NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert country mappings for geo-pricing
INSERT INTO public.country_region_mapping (country_code, country_name, region) VALUES
-- Africa
('ZA', 'South Africa', 'africa'),
('NG', 'Nigeria', 'africa'),
('KE', 'Kenya', 'africa'),
('EG', 'Egypt', 'africa'),
('MA', 'Morocco', 'africa'),
('GH', 'Ghana', 'africa'),
('TZ', 'Tanzania', 'africa'),
('ET', 'Ethiopia', 'africa'),
-- South America
('BR', 'Brazil', 'south_america'),
('AR', 'Argentina', 'south_america'),
('CO', 'Colombia', 'south_america'),
('PE', 'Peru', 'south_america'),
('CL', 'Chile', 'south_america'),
('EC', 'Ecuador', 'south_america'),
('VE', 'Venezuela', 'south_america'),
('BO', 'Bolivia', 'south_america'),
('PY', 'Paraguay', 'south_america'),
('UY', 'Uruguay', 'south_america'),
-- USA & Canada
('US', 'United States', 'usa_canada'),
('CA', 'Canada', 'usa_canada'),
-- UK
('GB', 'United Kingdom', 'uk'),
-- North & West Europe
('DE', 'Germany', 'north_west_europe'),
('FR', 'France', 'north_west_europe'),
('NL', 'Netherlands', 'north_west_europe'),
('BE', 'Belgium', 'north_west_europe'),
('AT', 'Austria', 'north_west_europe'),
('CH', 'Switzerland', 'north_west_europe'),
('IE', 'Ireland', 'north_west_europe'),
('DK', 'Denmark', 'north_west_europe'),
('SE', 'Sweden', 'north_west_europe'),
('NO', 'Norway', 'north_west_europe'),
('FI', 'Finland', 'north_west_europe'),
('LU', 'Luxembourg', 'north_west_europe'),
-- East & South Europe
('PL', 'Poland', 'east_south_europe'),
('CZ', 'Czech Republic', 'east_south_europe'),
('HU', 'Hungary', 'east_south_europe'),
('RO', 'Romania', 'east_south_europe'),
('BG', 'Bulgaria', 'east_south_europe'),
('HR', 'Croatia', 'east_south_europe'),
('SK', 'Slovakia', 'east_south_europe'),
('SI', 'Slovenia', 'east_south_europe'),
('GR', 'Greece', 'east_south_europe'),
('PT', 'Portugal', 'east_south_europe'),
('ES', 'Spain', 'east_south_europe'),
('IT', 'Italy', 'east_south_europe'),
-- Lower economic Asia
('IN', 'India', 'asia_lower'),
('PH', 'Philippines', 'asia_lower'),
('VN', 'Vietnam', 'asia_lower'),
('ID', 'Indonesia', 'asia_lower'),
('TH', 'Thailand', 'asia_lower'),
('MY', 'Malaysia', 'asia_lower'),
('BD', 'Bangladesh', 'asia_lower'),
('PK', 'Pakistan', 'asia_lower'),
-- Higher economic Asia
('JP', 'Japan', 'asia_higher'),
('KR', 'South Korea', 'asia_higher'),
('SG', 'Singapore', 'asia_higher'),
('HK', 'Hong Kong', 'asia_higher'),
('TW', 'Taiwan', 'asia_higher'),
('AU', 'Australia', 'asia_higher'),
('NZ', 'New Zealand', 'asia_higher'),
('CN', 'China', 'asia_higher');

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_regional_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_region_mapping ENABLE ROW LEVEL SECURITY;

-- Products policies (public read, admin write)
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage products"
ON public.products FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Regional pricing policies
CREATE POLICY "Anyone can view regional pricing"
ON public.product_regional_pricing FOR SELECT
USING (true);

CREATE POLICY "Admins can manage regional pricing"
ON public.product_regional_pricing FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Course enrollments policies
CREATE POLICY "Users can view own enrollments"
ON public.course_enrollments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollments"
ON public.course_enrollments FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage enrollments"
ON public.course_enrollments FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can enroll themselves"
ON public.course_enrollments FOR INSERT
WITH CHECK (auth.uid() = user_id AND enrollment_type = 'purchase');

-- Media library policies
CREATE POLICY "Users can view own media"
ON public.media_library FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all media"
ON public.media_library FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload own media"
ON public.media_library FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media"
ON public.media_library FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
ON public.media_library FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all media"
ON public.media_library FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Country mapping is public read-only
CREATE POLICY "Anyone can view country mappings"
ON public.country_region_mapping FOR SELECT
USING (true);

CREATE POLICY "Admins can manage country mappings"
ON public.country_region_mapping FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to calculate price for a region
CREATE OR REPLACE FUNCTION public.calculate_regional_price(
  p_base_price_usd NUMERIC,
  p_region pricing_region
)
RETURNS TABLE (
  price NUMERIC,
  currency TEXT,
  discount_percentage INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discount INTEGER;
  v_currency TEXT;
  v_price NUMERIC;
BEGIN
  -- Determine discount and currency based on region
  CASE p_region
    WHEN 'africa', 'south_america', 'asia_lower' THEN
      v_discount := 65;
      v_currency := 'USD';
    WHEN 'usa_canada' THEN
      v_discount := 0;
      v_currency := 'USD';
    WHEN 'uk' THEN
      v_discount := 0;
      v_currency := 'GBP';
    WHEN 'north_west_europe' THEN
      v_discount := 0;
      v_currency := 'EUR';
    WHEN 'east_south_europe' THEN
      v_discount := 40;
      v_currency := 'EUR';
    WHEN 'asia_higher' THEN
      v_discount := 0;
      v_currency := 'USD';
    ELSE
      v_discount := 0;
      v_currency := 'USD';
  END CASE;

  -- Calculate final price (just apply discount, currency conversion handled client-side)
  v_price := p_base_price_usd * (1 - v_discount::NUMERIC / 100);

  RETURN QUERY SELECT v_price, v_currency, v_discount;
END;
$$;

-- Create updated_at triggers
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_enrollments_updated_at
BEFORE UPDATE ON public.course_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_library_updated_at
BEFORE UPDATE ON public.media_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for media bucket
CREATE POLICY "Anyone can view media files"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own media files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own media files"
ON storage.objects FOR DELETE
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);