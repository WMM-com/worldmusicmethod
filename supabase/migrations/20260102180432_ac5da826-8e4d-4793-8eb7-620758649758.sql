-- Create product_purchase_tags junction table for multiple tags
CREATE TABLE public.product_purchase_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.email_tags(id) ON DELETE CASCADE,
  remove_on_refund BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.product_purchase_tags ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read (admin check happens in app)
CREATE POLICY "Allow authenticated read" ON public.product_purchase_tags
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage (admin check happens in app)
CREATE POLICY "Allow authenticated manage" ON public.product_purchase_tags
  FOR ALL USING (auth.role() = 'authenticated');