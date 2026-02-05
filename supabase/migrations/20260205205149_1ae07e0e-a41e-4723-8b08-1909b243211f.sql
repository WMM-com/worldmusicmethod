-- Create profile_pages table for multi-page artist websites
CREATE TABLE public.profile_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_home BOOLEAN NOT NULL DEFAULT false,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_slug UNIQUE (user_id, slug),
  CONSTRAINT unique_user_home UNIQUE (user_id, is_home) DEFERRABLE INITIALLY DEFERRED
);

-- Add page_id column to profile_sections
ALTER TABLE public.profile_sections 
ADD COLUMN page_id UUID REFERENCES public.profile_pages(id) ON DELETE SET NULL;

-- Enable RLS on profile_pages
ALTER TABLE public.profile_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies for profile_pages
CREATE POLICY "Users can view their own pages"
ON public.profile_pages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pages"
ON public.profile_pages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pages"
ON public.profile_pages FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pages"
ON public.profile_pages FOR DELETE
USING (auth.uid() = user_id);

-- Public can view pages of public profiles
CREATE POLICY "Public can view pages of public profiles"
ON public.profile_pages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id AND p.is_public = true
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_profile_pages_updated_at
BEFORE UPDATE ON public.profile_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to ensure only one home page per user
CREATE OR REPLACE FUNCTION public.ensure_single_home_page()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If setting is_home to true, unset any existing home page for this user
  IF NEW.is_home = true THEN
    UPDATE public.profile_pages
    SET is_home = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_home = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to enforce single home page
CREATE TRIGGER enforce_single_home_page
BEFORE INSERT OR UPDATE OF is_home ON public.profile_pages
FOR EACH ROW
WHEN (NEW.is_home = true)
EXECUTE FUNCTION public.ensure_single_home_page();

-- Function to get or create default home page
CREATE OR REPLACE FUNCTION public.ensure_default_home_page(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page_id UUID;
BEGIN
  -- Check if home page exists
  SELECT id INTO v_page_id
  FROM public.profile_pages
  WHERE user_id = p_user_id AND is_home = true
  LIMIT 1;
  
  -- If no home page, create one
  IF v_page_id IS NULL THEN
    INSERT INTO public.profile_pages (user_id, slug, title, order_index, is_home)
    VALUES (p_user_id, 'home', 'Home', 0, true)
    RETURNING id INTO v_page_id;
    
    -- Associate existing sections without a page_id to the home page
    UPDATE public.profile_sections
    SET page_id = v_page_id
    WHERE user_id = p_user_id AND page_id IS NULL;
  END IF;
  
  RETURN v_page_id;
END;
$$;

-- Create index for faster lookups
CREATE INDEX idx_profile_pages_user_id ON public.profile_pages(user_id);
CREATE INDEX idx_profile_pages_slug ON public.profile_pages(user_id, slug);
CREATE INDEX idx_profile_sections_page_id ON public.profile_sections(page_id);