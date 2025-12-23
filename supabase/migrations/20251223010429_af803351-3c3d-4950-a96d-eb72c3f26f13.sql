-- Add tags to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add tutor selection options (using existing tutor_name field)

-- Create table for product expert attribution
CREATE TABLE IF NOT EXISTS public.product_expert_attributions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  expert_name text NOT NULL,
  attribution_percentage numeric NOT NULL CHECK (attribution_percentage >= 0 AND attribution_percentage <= 100),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_expert_attributions ENABLE ROW LEVEL SECURITY;

-- Create policies for product_expert_attributions
CREATE POLICY "Admins can manage expert attributions" 
ON public.product_expert_attributions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view expert attributions" 
ON public.product_expert_attributions 
FOR SELECT 
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_product_expert_attributions_product_id ON public.product_expert_attributions(product_id);