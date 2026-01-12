-- Create pages table for managing page URLs and redirects
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  page_type TEXT NOT NULL DEFAULT 'static',
  meta_title TEXT,
  meta_description TEXT,
  redirect_url TEXT,
  redirect_code INTEGER DEFAULT 301,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Pages are viewable by everyone (for routing)
CREATE POLICY "Pages are viewable by everyone" 
ON public.pages 
FOR SELECT 
USING (true);

-- Only admins can manage pages (using has_role function)
CREATE POLICY "Admins can manage pages" 
ON public.pages 
FOR ALL 
USING (
  (SELECT has_role(auth.uid(), 'admin'))
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pages_updated_at
BEFORE UPDATE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();