-- Add tags column to profiles table for storing imported user tags
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT NULL;

-- Add index for tag queries
CREATE INDEX IF NOT EXISTS idx_profiles_tags ON public.profiles USING GIN(tags);