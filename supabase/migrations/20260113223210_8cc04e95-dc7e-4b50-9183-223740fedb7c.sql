-- Add policy to allow enrolled users to view their enrolled courses (including unpublished)
CREATE POLICY "Enrolled users can view their courses"
ON public.courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE course_enrollments.course_id = courses.id
    AND course_enrollments.user_id = auth.uid()
    AND course_enrollments.is_active = true
  )
);