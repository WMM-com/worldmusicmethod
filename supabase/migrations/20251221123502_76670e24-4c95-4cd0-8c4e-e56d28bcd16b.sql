-- Create table for course landing page content
CREATE TABLE public.course_landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  hero_background_url TEXT,
  course_image_url TEXT,
  trailer_video_url TEXT,
  styles_image_desktop TEXT,
  styles_image_mobile TEXT,
  overview_heading TEXT,
  course_overview TEXT[],
  instrument_tag TEXT,
  course_includes TEXT[],
  expert_name TEXT,
  expert_image_url TEXT,
  expert_bio TEXT[],
  resources JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  learning_outcomes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_landing_pages ENABLE ROW LEVEL SECURITY;

-- Allow public read access for landing pages
CREATE POLICY "Anyone can view course landing pages" 
ON public.course_landing_pages 
FOR SELECT 
USING (true);

-- Allow admins to manage landing pages
CREATE POLICY "Admins can manage course landing pages" 
ON public.course_landing_pages 
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add unique constraint on course_id
CREATE UNIQUE INDEX course_landing_pages_course_id_idx ON public.course_landing_pages(course_id);

-- Add trigger for updated_at
CREATE TRIGGER update_course_landing_pages_updated_at
BEFORE UPDATE ON public.course_landing_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();