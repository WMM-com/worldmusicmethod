-- Add tutor_name column to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS tutor_name text;