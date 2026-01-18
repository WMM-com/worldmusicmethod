-- Add cover_image_url for artist pages (wide/widescreen cover image, separate from profile image)
ALTER TABLE public.media_artists 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.media_artists.image_url IS 'Profile/avatar image for artist';
COMMENT ON COLUMN public.media_artists.cover_image_url IS 'Wide/widescreen cover image for artist page header';
COMMENT ON COLUMN public.media_artists.country IS 'Country the artist is from';