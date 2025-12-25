-- Add structured content fields to course_modules
ALTER TABLE public.course_modules 
ADD COLUMN IF NOT EXISTS learning_outcomes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cultural_context text,
ADD COLUMN IF NOT EXISTS youtube_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS spotify_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS listening_references jsonb DEFAULT '[]'::jsonb;

-- Add structured content fields to module_lessons  
ALTER TABLE public.module_lessons
ADD COLUMN IF NOT EXISTS youtube_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS spotify_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS file_attachments jsonb DEFAULT '[]'::jsonb;

-- Add comments for clarity
COMMENT ON COLUMN public.course_modules.learning_outcomes IS 'Array of {text: string} objects';
COMMENT ON COLUMN public.course_modules.listening_references IS 'Array of {title: string, artist: string, url?: string, platform?: string} objects';
COMMENT ON COLUMN public.module_lessons.file_attachments IS 'Array of {name: string, url: string, type: string} objects';