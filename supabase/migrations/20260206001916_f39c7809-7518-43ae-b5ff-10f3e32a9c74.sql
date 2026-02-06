-- Drop the problematic unique constraint on (user_id, is_home)
-- This was preventing users from creating more than 2 pages (one home, one non-home)
ALTER TABLE public.profile_pages DROP CONSTRAINT IF EXISTS unique_user_home;

-- Create a partial unique constraint that only ensures ONE home page per user
-- Non-home pages (is_home = false) can have unlimited entries
CREATE UNIQUE INDEX unique_user_home_page ON public.profile_pages (user_id) 
WHERE is_home = true;

-- Add a check to limit users to max 5 pages (handled in application layer, but we can add a trigger)
CREATE OR REPLACE FUNCTION check_max_profile_pages()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.profile_pages WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 profile pages allowed per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for insert only (allows updates and deletes freely)
DROP TRIGGER IF EXISTS check_max_pages_trigger ON public.profile_pages;
CREATE TRIGGER check_max_pages_trigger
BEFORE INSERT ON public.profile_pages
FOR EACH ROW
EXECUTE FUNCTION check_max_profile_pages();