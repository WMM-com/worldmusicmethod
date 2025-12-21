-- Add missing columns to course_landing_pages
ALTER TABLE public.course_landing_pages 
ADD COLUMN IF NOT EXISTS learning_outcomes_intro TEXT DEFAULT 'By the end of this course, you will be able to:',
ADD COLUMN IF NOT EXISTS cta_title TEXT DEFAULT 'Ready To Start Your Journey?',
ADD COLUMN IF NOT EXISTS cta_description TEXT DEFAULT 'Join a worldwide community of musicians.';