-- Add media_type column to posts table for video/audio support
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT NULL;

-- Add comment to clarify usage
COMMENT ON COLUMN public.posts.media_type IS 'Type of media: image, video, audio, or null';