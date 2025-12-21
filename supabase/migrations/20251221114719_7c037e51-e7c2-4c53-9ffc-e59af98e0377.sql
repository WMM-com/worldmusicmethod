-- Grant admins full CRUD access to course editing tables

-- Ensure Row Level Security is enabled
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_lessons ENABLE ROW LEVEL SECURITY;

-- Courses
DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;
CREATE POLICY "Admins can manage all courses"
ON public.courses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Modules
DROP POLICY IF EXISTS "Admins can manage all modules" ON public.course_modules;
CREATE POLICY "Admins can manage all modules"
ON public.course_modules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Lessons
DROP POLICY IF EXISTS "Admins can manage all lessons" ON public.module_lessons;
CREATE POLICY "Admins can manage all lessons"
ON public.module_lessons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
