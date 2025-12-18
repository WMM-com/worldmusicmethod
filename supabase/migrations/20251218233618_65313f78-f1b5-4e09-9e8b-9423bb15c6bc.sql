-- Create course_groups table
CREATE TABLE public.course_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create junction table for courses in groups
CREATE TABLE public.course_group_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, course_id)
);

-- Enable RLS
ALTER TABLE public.course_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_group_courses ENABLE ROW LEVEL SECURITY;

-- RLS policies for course_groups
CREATE POLICY "Admins can manage course groups"
ON public.course_groups FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view course groups"
ON public.course_groups FOR SELECT
USING (true);

-- RLS policies for course_group_courses
CREATE POLICY "Admins can manage course group courses"
ON public.course_group_courses FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view course group courses"
ON public.course_group_courses FOR SELECT
USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_course_groups_updated_at
BEFORE UPDATE ON public.course_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();