-- Add course_includes column to course_landing_pages
ALTER TABLE public.course_landing_pages
ADD COLUMN IF NOT EXISTS course_includes text[] DEFAULT ARRAY['Synced Notation & Tab', 'Downloadable PDF Notation', 'Lifetime Access', 'Student Community'];