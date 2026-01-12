-- Add slug column to courses for SEO-friendly URLs
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);