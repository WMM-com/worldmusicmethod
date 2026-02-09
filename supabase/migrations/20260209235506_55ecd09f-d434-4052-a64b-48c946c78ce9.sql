
-- Add timezone column to profiles (IANA timezone string)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- Add comment
COMMENT ON COLUMN public.profiles.timezone IS 'IANA timezone string e.g. Europe/London, America/New_York';
