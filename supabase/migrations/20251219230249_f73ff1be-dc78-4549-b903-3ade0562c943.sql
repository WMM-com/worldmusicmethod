-- Add username and profile visibility to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'artist',
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS paypal_email TEXT,
ADD COLUMN IF NOT EXISTS tip_jar_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS profile_layout JSONB DEFAULT '[]';

-- Create profile sections table for customizable sections
CREATE TABLE public.profile_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL, -- 'bio', 'gallery', 'spotify', 'youtube', 'events', 'projects', 'social_feed'
  title TEXT,
  content JSONB DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profile gallery items
CREATE TABLE public.profile_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profile tabs/menu for custom navigation
CREATE TABLE public.profile_tabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT, -- Rich text/markdown content
  order_index INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profile projects table
CREATE TABLE public.profile_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  external_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_sections
CREATE POLICY "Users can manage own sections" ON public.profile_sections
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view sections of public profiles" ON public.profile_sections
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = profile_sections.user_id AND p.is_public = true
  )
);

-- RLS Policies for profile_gallery
CREATE POLICY "Users can manage own gallery" ON public.profile_gallery
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view gallery of public profiles" ON public.profile_gallery
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = profile_gallery.user_id AND p.is_public = true
  )
);

-- RLS Policies for profile_tabs
CREATE POLICY "Users can manage own tabs" ON public.profile_tabs
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view tabs of public profiles" ON public.profile_tabs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = profile_tabs.user_id AND p.is_public = true
  )
);

-- RLS Policies for profile_projects
CREATE POLICY "Users can manage own projects" ON public.profile_projects
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view projects of public profiles" ON public.profile_projects
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = profile_projects.user_id AND p.is_public = true
  )
);

-- Update profiles RLS to allow public viewing
CREATE POLICY "Public can view public profiles" ON public.profiles
FOR SELECT USING (is_public = true);

-- Create triggers for updated_at
CREATE TRIGGER update_profile_sections_updated_at
  BEFORE UPDATE ON public.profile_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profile_tabs_updated_at
  BEFORE UPDATE ON public.profile_tabs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profile_projects_updated_at
  BEFORE UPDATE ON public.profile_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get public profile by username
CREATE OR REPLACE FUNCTION public.get_public_profile(p_username TEXT)
RETURNS TABLE(
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,
  bio TEXT,
  tagline TEXT,
  business_name TEXT,
  website_url TEXT,
  profile_type TEXT,
  social_links JSONB,
  tip_jar_enabled BOOLEAN,
  paypal_email TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.cover_image_url,
    p.bio,
    p.tagline,
    p.business_name,
    p.website_url,
    p.profile_type,
    p.social_links,
    p.tip_jar_enabled,
    CASE WHEN p.tip_jar_enabled THEN p.paypal_email ELSE NULL END
  FROM public.profiles p
  WHERE p.username = p_username AND p.is_public = true;
$$;