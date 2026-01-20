-- Create lesson_tests table to link tests to lessons
CREATE TABLE public.lesson_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.module_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 70, -- percentage
  randomize_questions BOOLEAN DEFAULT true,
  allow_retry BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lesson_id) -- One test per lesson
);

-- Create test_questions table
CREATE TABLE public.test_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.lesson_tests(id) ON DELETE CASCADE,
  question_text TEXT, -- Optional text prompt (can be empty for audio-only)
  audio_url TEXT, -- R2 URL for audio file
  order_index INTEGER NOT NULL DEFAULT 0,
  points NUMERIC(3,1) DEFAULT 1, -- Full points for correct answer
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_answers table  
CREATE TABLE public.test_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.test_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_test_attempts table to track scores
CREATE TABLE public.user_test_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  test_id UUID NOT NULL REFERENCES public.lesson_tests(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL, -- Actual score with half-points
  max_score NUMERIC(5,2) NOT NULL, -- Maximum possible score
  percentage NUMERIC(5,2) NOT NULL, -- Score as percentage
  question_results JSONB NOT NULL DEFAULT '[]', -- Array of {question_id, correct, attempts, points_earned}
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.lesson_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_test_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lesson_tests (readable by enrolled users)
CREATE POLICY "Anyone can view tests" ON public.lesson_tests
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage tests" ON public.lesson_tests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for test_questions (readable by enrolled users)
CREATE POLICY "Anyone can view questions" ON public.test_questions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage questions" ON public.test_questions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for test_answers (readable by enrolled users)
CREATE POLICY "Anyone can view answers" ON public.test_answers
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage answers" ON public.test_answers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_test_attempts (users can only see their own)
CREATE POLICY "Users can view own attempts" ON public.user_test_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attempts" ON public.user_test_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts" ON public.user_test_attempts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts" ON public.user_test_attempts
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_test_questions_test_id ON public.test_questions(test_id);
CREATE INDEX idx_test_answers_question_id ON public.test_answers(question_id);
CREATE INDEX idx_user_test_attempts_user_test ON public.user_test_attempts(user_id, test_id);
CREATE INDEX idx_lesson_tests_lesson_id ON public.lesson_tests(lesson_id);

-- Add triggers for updated_at
CREATE TRIGGER update_lesson_tests_updated_at
  BEFORE UPDATE ON public.lesson_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_questions_updated_at
  BEFORE UPDATE ON public.test_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();