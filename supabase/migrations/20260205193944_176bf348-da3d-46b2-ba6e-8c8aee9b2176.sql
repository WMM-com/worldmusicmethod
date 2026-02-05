-- Add cover_settings column to extended_profiles to persist cover image configuration
ALTER TABLE public.extended_profiles 
ADD COLUMN IF NOT EXISTS cover_settings JSONB DEFAULT '{"height": "medium", "focalPointX": 50, "focalPointY": 50}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.extended_profiles.cover_settings IS 'Stores cover image settings: height (small/medium/large), focalPointX (0-100), focalPointY (0-100)';