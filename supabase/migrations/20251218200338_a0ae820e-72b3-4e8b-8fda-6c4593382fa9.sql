-- Courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  country TEXT NOT NULL,
  region_theme JSONB DEFAULT '{}',
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Course modules
CREATE TABLE public.course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  region_name TEXT,
  color_theme TEXT DEFAULT 'earth',
  icon_type TEXT DEFAULT 'mountain',
  estimated_duration INTEGER, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Module lessons
CREATE TABLE public.module_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lesson_type TEXT NOT NULL DEFAULT 'video', -- video, reading, listening, assignment
  video_url TEXT,
  duration_seconds INTEGER,
  content TEXT, -- markdown content
  listening_references JSONB DEFAULT '[]',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User lesson progress
CREATE TABLE public.user_lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.module_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  watch_time_seconds INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Practice scores (side quests)
CREATE TABLE public.user_practice_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  practice_type TEXT NOT NULL, -- rhythm, ear_training, theory
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User course stats (gamification)
CREATE TABLE public.user_course_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  xp INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  badges JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_practice_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_stats ENABLE ROW LEVEL SECURITY;

-- Courses policies (public read for published, owner full access)
CREATE POLICY "Anyone can view published courses" ON public.courses
  FOR SELECT USING (is_published = true);

CREATE POLICY "Owners can manage their courses" ON public.courses
  FOR ALL USING (auth.uid() = user_id);

-- Modules policies (public read if course is published)
CREATE POLICY "Anyone can view modules of published courses" ON public.course_modules
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND is_published = true)
  );

CREATE POLICY "Owners can manage modules" ON public.course_modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND user_id = auth.uid())
  );

-- Lessons policies
CREATE POLICY "Anyone can view lessons of published courses" ON public.module_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_modules cm
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cm.id = module_id AND c.is_published = true
    )
  );

CREATE POLICY "Owners can manage lessons" ON public.module_lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.course_modules cm
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cm.id = module_id AND c.user_id = auth.uid()
    )
  );

-- User progress policies (own data only)
CREATE POLICY "Users can manage own progress" ON public.user_lesson_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own practice scores" ON public.user_practice_scores
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own course stats" ON public.user_course_stats
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_course_modules_course ON public.course_modules(course_id);
CREATE INDEX idx_module_lessons_module ON public.module_lessons(module_id);
CREATE INDEX idx_user_progress_user ON public.user_lesson_progress(user_id);
CREATE INDEX idx_user_progress_lesson ON public.user_lesson_progress(lesson_id);
CREATE INDEX idx_practice_scores_user ON public.user_practice_scores(user_id);
CREATE INDEX idx_course_stats_user ON public.user_course_stats(user_id);