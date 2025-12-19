-- Add sale pricing columns to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sale_price_usd numeric,
ADD COLUMN IF NOT EXISTS sale_ends_at timestamp with time zone;

-- Add private_lesson product type support (already supports text, just add tutor_id for lessons)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS tutor_id uuid;

-- Create tutor availability table
CREATE TABLE public.tutor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL,
  available_at timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  is_booked boolean DEFAULT false,
  booking_token uuid DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tutor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutors can manage their availability"
ON public.tutor_availability FOR ALL
USING (auth.uid() = tutor_id);

CREATE POLICY "Anyone can view unbooked availability"
ON public.tutor_availability FOR SELECT
USING (is_booked = false);

-- Create lesson bookings table
CREATE TABLE public.lesson_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  tutor_id uuid NOT NULL,
  availability_id uuid REFERENCES public.tutor_availability(id),
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'pending',
  payment_status text DEFAULT 'unpaid',
  price numeric,
  currency text DEFAULT 'USD',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their bookings"
ON public.lesson_bookings FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can create bookings"
ON public.lesson_bookings FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their pending bookings"
ON public.lesson_bookings FOR UPDATE
USING (auth.uid() = student_id AND status = 'pending');

CREATE POLICY "Tutors can view bookings for their lessons"
ON public.lesson_bookings FOR SELECT
USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can update their lesson bookings"
ON public.lesson_bookings FOR UPDATE
USING (auth.uid() = tutor_id);

-- Create lesson messages table for in-app messaging
CREATE TABLE public.lesson_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  message text NOT NULL,
  message_type text DEFAULT 'text',
  metadata jsonb DEFAULT '{}',
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages"
ON public.lesson_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
ON public.lesson_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can mark messages as read"
ON public.lesson_messages FOR UPDATE
USING (auth.uid() = recipient_id);

-- Create lesson conversations table
CREATE TABLE public.lesson_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  tutor_id uuid NOT NULL,
  booking_id uuid REFERENCES public.lesson_bookings(id),
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, tutor_id)
);

ALTER TABLE public.lesson_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their conversations"
ON public.lesson_conversations FOR SELECT
USING (auth.uid() = student_id OR auth.uid() = tutor_id);

CREATE POLICY "Users can create conversations"
ON public.lesson_conversations FOR INSERT
WITH CHECK (auth.uid() = student_id OR auth.uid() = tutor_id);

CREATE POLICY "Users can update their conversations"
ON public.lesson_conversations FOR UPDATE
USING (auth.uid() = student_id OR auth.uid() = tutor_id);

-- Add index for faster message queries
CREATE INDEX idx_lesson_messages_conversation ON public.lesson_messages(conversation_id, created_at);
CREATE INDEX idx_lesson_messages_recipient_unread ON public.lesson_messages(recipient_id) WHERE read_at IS NULL;