-- Add SEO meta fields to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS meta_image TEXT;

-- Add a check constraint for meta_description length
ALTER TABLE public.courses
ADD CONSTRAINT courses_meta_description_length CHECK (char_length(meta_description) <= 160);