-- Add course_duration_minutes to landing pages
ALTER TABLE public.course_landing_pages
ADD COLUMN IF NOT EXISTS course_duration_minutes integer DEFAULT 0;