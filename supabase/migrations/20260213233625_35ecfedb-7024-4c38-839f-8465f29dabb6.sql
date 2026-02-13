
-- Allow enrolled users to view modules of courses they're enrolled in
CREATE POLICY "Enrolled users can view modules of their courses"
ON public.course_modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE course_enrollments.course_id = course_modules.course_id
      AND course_enrollments.user_id = auth.uid()
      AND course_enrollments.is_active = true
  )
);

-- Allow enrolled users to view lessons of courses they're enrolled in
CREATE POLICY "Enrolled users can view lessons of their courses"
ON public.module_lessons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM course_modules cm
    JOIN course_enrollments ce ON ce.course_id = cm.course_id
    WHERE cm.id = module_lessons.module_id
      AND ce.user_id = auth.uid()
      AND ce.is_active = true
  )
);
