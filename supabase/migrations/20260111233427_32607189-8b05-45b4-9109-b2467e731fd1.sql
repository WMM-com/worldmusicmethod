-- Add display_name_preference column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name_preference text DEFAULT 'full_name';

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.display_name_preference IS 'Options: username, full_name, both';