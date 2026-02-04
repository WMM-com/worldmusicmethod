-- Create user_points table for gamification
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create point_transactions table to track point history
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  prompt_question TEXT,
  prompt_answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS for user_points
CREATE POLICY "Users can view their own points"
  ON public.user_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user points"
  ON public.user_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update user points"
  ON public.user_points FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS for point_transactions
CREATE POLICY "Users can view their own point transactions"
  ON public.point_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS for reviews
-- Anyone can view reviews (public)
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Users can only insert if they own the enrollment
CREATE POLICY "Users can insert reviews for enrolled courses"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.course_enrollments
      WHERE course_enrollments.user_id = auth.uid()
        AND course_enrollments.course_id = reviews.course_id
        AND course_enrollments.is_active = true
    )
  );

-- Users can only update their own reviews
CREATE POLICY "Users can update their own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own reviews
CREATE POLICY "Users can delete their own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to award points for reviews (max 5 reviews = 250 points total)
CREATE OR REPLACE FUNCTION public.award_review_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_review_count INTEGER;
  v_points_to_award INTEGER := 50;
BEGIN
  -- Count how many reviews this user has already written (including this one)
  SELECT COUNT(*) INTO v_review_count
  FROM public.reviews
  WHERE user_id = NEW.user_id;
  
  -- Only award points for first 5 reviews
  IF v_review_count <= 5 THEN
    -- Insert point transaction
    INSERT INTO public.point_transactions (user_id, points, reason, reference_id)
    VALUES (NEW.user_id, v_points_to_award, 'Review submitted (' || v_review_count || '/5)', NEW.id::TEXT);
    
    -- Upsert user_points
    INSERT INTO public.user_points (user_id, total_points)
    VALUES (NEW.user_id, v_points_to_award)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_points = user_points.total_points + v_points_to_award,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_award_review_points
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.award_review_points();

-- Add updated_at trigger for reviews
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for user_points
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_course_id ON public.reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON public.point_transactions(user_id);