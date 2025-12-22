-- Add first_name and last_name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS message_privacy text DEFAULT 'community';

-- Add comment to explain message_privacy values
COMMENT ON COLUMN public.profiles.message_privacy IS 'Values: community (accept from all), friends (accept from friends only)';