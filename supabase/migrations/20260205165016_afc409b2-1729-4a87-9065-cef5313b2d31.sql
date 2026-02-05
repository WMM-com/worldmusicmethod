-- Create extended_profiles table for additional profile customization
CREATE TABLE public.extended_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  hero_type TEXT DEFAULT 'standard' CHECK (hero_type IN ('standard', 'cut-out', 'minimal')),
  hero_config JSONB DEFAULT '{}',
  brand_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.extended_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view any extended profile (for public profile pages)
CREATE POLICY "Extended profiles are viewable by everyone"
ON public.extended_profiles FOR SELECT
USING (true);

-- Users can insert their own extended profile
CREATE POLICY "Users can insert their own extended profile"
ON public.extended_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own extended profile
CREATE POLICY "Users can update their own extended profile"
ON public.extended_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_extended_profiles_updated_at
BEFORE UPDATE ON public.extended_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();