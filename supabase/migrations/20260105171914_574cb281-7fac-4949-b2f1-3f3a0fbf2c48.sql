-- Add soundslice_preset column to module_lessons
ALTER TABLE public.module_lessons 
ADD COLUMN soundslice_preset TEXT DEFAULT 'guitar';

-- Add comment explaining the values
COMMENT ON COLUMN public.module_lessons.soundslice_preset IS 'Soundslice embed preset: guitar, flute, drum, or backing';