
-- =============================================
-- 1. Extend lessons table for recurring, group, buffer, cancellation
-- =============================================
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS lesson_type TEXT NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS max_students INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_policy_hours INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS allow_rescheduling BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recurring_config JSONB;

COMMENT ON COLUMN public.lessons.lesson_type IS 'single, recurring, or group';
COMMENT ON COLUMN public.lessons.recurring_config IS '{"frequency":"weekly","total_sessions":4,"series_price":null} - tutor chooses pricing model';

-- =============================================
-- 2. Extend booking_requests for cancellation/rescheduling and series
-- =============================================
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rescheduled_from_id UUID REFERENCES public.booking_requests(id),
  ADD COLUMN IF NOT EXISTS series_id UUID,
  ADD COLUMN IF NOT EXISTS series_index INTEGER;

-- =============================================
-- 3. Group lesson participants
-- =============================================
CREATE TABLE public.booking_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own participation"
  ON public.booking_participants FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Tutors can view participants of their lesson bookings"
  ON public.booking_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_requests br
      JOIN public.lessons l ON l.id = br.lesson_id
      WHERE br.id = booking_participants.request_id
      AND l.tutor_id = auth.uid()
    )
  );

CREATE POLICY "Students can join group lessons"
  ON public.booking_participants FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can cancel their participation"
  ON public.booking_participants FOR UPDATE
  USING (student_id = auth.uid());

-- =============================================
-- 4. Lesson Notes (post-lesson feedback from tutor)
-- =============================================
CREATE TABLE public.lesson_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_request_id UUID NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

-- Tutors can create/edit their own notes
CREATE POLICY "Authors can manage their notes"
  ON public.lesson_notes FOR ALL
  USING (author_id = auth.uid());

-- Students can view non-private notes on their bookings
CREATE POLICY "Students can view shared notes on their bookings"
  ON public.lesson_notes FOR SELECT
  USING (
    is_private = false AND
    EXISTS (
      SELECT 1 FROM public.booking_requests br
      WHERE br.id = booking_request_id AND br.student_id = auth.uid()
    )
  );

-- =============================================
-- 5. Lesson Ratings (students rate after completion)
-- =============================================
CREATE TABLE public.lesson_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_request_id UUID NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  tutor_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id),
  rating INTEGER NOT NULL,
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_request_id, student_id)
);

-- Validation trigger instead of CHECK constraint for rating range
CREATE OR REPLACE FUNCTION public.validate_lesson_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_lesson_rating_trigger
  BEFORE INSERT OR UPDATE ON public.lesson_ratings
  FOR EACH ROW EXECUTE FUNCTION public.validate_lesson_rating();

ALTER TABLE public.lesson_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can rate their completed lessons"
  ON public.lesson_ratings FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view their own ratings"
  ON public.lesson_ratings FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Tutors can view ratings for their lessons"
  ON public.lesson_ratings FOR SELECT
  USING (tutor_id = auth.uid());

CREATE POLICY "Anyone can view ratings publicly"
  ON public.lesson_ratings FOR SELECT
  USING (true);

-- =============================================
-- 6. Availability Templates (save/reuse patterns)
-- =============================================
CREATE TABLE public.availability_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  name TEXT NOT NULL,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.availability_templates.slots IS 'Array of {day_of_week, start_time, end_time, timezone}';

ALTER TABLE public.availability_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutors can manage their own templates"
  ON public.availability_templates FOR ALL
  USING (tutor_id = auth.uid());

-- =============================================
-- Timestamp triggers for new tables
-- =============================================
CREATE TRIGGER update_lesson_notes_updated_at
  BEFORE UPDATE ON public.lesson_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_availability_templates_updated_at
  BEFORE UPDATE ON public.availability_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
