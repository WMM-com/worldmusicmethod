-- Create visibility enum for profile visibility
CREATE TYPE public.profile_visibility AS ENUM ('private', 'members', 'public');

-- Add visibility column to profiles (replacing is_public boolean)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS visibility public.profile_visibility DEFAULT 'private';

-- Migrate existing is_public values to new visibility column
UPDATE public.profiles 
SET visibility = CASE 
  WHEN is_public = true THEN 'public'::public.profile_visibility
  ELSE 'private'::public.profile_visibility
END
WHERE visibility IS NULL OR visibility = 'private';

-- Note: We keep is_public for backwards compatibility for now