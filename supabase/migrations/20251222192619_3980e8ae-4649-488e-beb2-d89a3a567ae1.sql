-- Add media columns to comments table
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;