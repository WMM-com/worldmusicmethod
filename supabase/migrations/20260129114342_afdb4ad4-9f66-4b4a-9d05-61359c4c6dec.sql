-- Create redirections table for URL redirects
CREATE TABLE public.redirections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302, 307, 308)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_url)
);

-- Enable RLS
ALTER TABLE public.redirections ENABLE ROW LEVEL SECURITY;

-- Public can read active redirections (needed for redirect checks)
CREATE POLICY "Anyone can read active redirections"
  ON public.redirections
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage redirections
CREATE POLICY "Admins can manage redirections"
  ON public.redirections
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_redirections_updated_at
  BEFORE UPDATE ON public.redirections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_redirections_source_url ON public.redirections(source_url) WHERE is_active = true;