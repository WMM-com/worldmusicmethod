
-- Drop old tutor_availability table (different schema)
DROP TABLE IF EXISTS public.tutor_availability CASCADE;

-- 1. The Product (Lesson)
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  duration_minutes INTEGER DEFAULT 60,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tutor General Availability (new schema)
CREATE TABLE public.tutor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.profiles(id),
  lesson_id UUID REFERENCES public.lessons(id),
  day_of_week INTEGER,
  start_time TIME,
  end_time TIME,
  timezone TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  specific_date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. The Booking Request
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. The Proposed Slots
CREATE TABLE IF NOT EXISTS public.booking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.booking_requests(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'proposed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active lessons"
  ON public.lessons FOR SELECT
  USING (active = true);

CREATE POLICY "Tutors can manage their own lessons"
  ON public.lessons FOR ALL
  USING (auth.uid() = tutor_id)
  WITH CHECK (auth.uid() = tutor_id);

-- RLS for tutor_availability
ALTER TABLE public.tutor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active availability"
  ON public.tutor_availability FOR SELECT
  USING (active = true);

CREATE POLICY "Tutors can manage their own availability"
  ON public.tutor_availability FOR ALL
  USING (auth.uid() = tutor_id)
  WITH CHECK (auth.uid() = tutor_id);

-- RLS for booking_requests
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own requests"
  ON public.booking_requests FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Tutors can view requests for their lessons"
  ON public.booking_requests FOR SELECT
  USING (lesson_id IN (SELECT id FROM public.lessons WHERE tutor_id = auth.uid()));

CREATE POLICY "Students can create requests"
  ON public.booking_requests FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students and tutors can update requests"
  ON public.booking_requests FOR UPDATE
  USING (
    auth.uid() = student_id 
    OR lesson_id IN (SELECT id FROM public.lessons WHERE tutor_id = auth.uid())
  );

-- RLS for booking_slots
ALTER TABLE public.booking_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view slots for their requests"
  ON public.booking_slots FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM public.booking_requests 
      WHERE student_id = auth.uid()
      OR lesson_id IN (SELECT id FROM public.lessons WHERE tutor_id = auth.uid())
    )
  );

CREATE POLICY "Students can propose slots"
  ON public.booking_slots FOR INSERT
  WITH CHECK (
    request_id IN (SELECT id FROM public.booking_requests WHERE student_id = auth.uid())
  );

CREATE POLICY "Tutors can update slot status"
  ON public.booking_slots FOR UPDATE
  USING (
    request_id IN (
      SELECT br.id FROM public.booking_requests br
      JOIN public.lessons l ON br.lesson_id = l.id
      WHERE l.tutor_id = auth.uid()
    )
  );

-- Updated_at trigger for lessons
CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
