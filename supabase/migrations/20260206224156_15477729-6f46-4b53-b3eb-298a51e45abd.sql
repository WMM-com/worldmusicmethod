
-- 1. Auto-provision Home pages for ALL existing profiles that don't have one
INSERT INTO profile_pages (user_id, title, slug, order_index, is_home, is_visible)
SELECT p.id, 'Home', 'home', 0, true, true
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM profile_pages pp WHERE pp.user_id = p.id AND pp.is_home = true
);

-- 2. Auto-provision About pages for ALL existing profiles that don't have one
INSERT INTO profile_pages (user_id, title, slug, order_index, is_home, is_visible)
SELECT p.id, 'About', 'about', 1, false, true
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM profile_pages pp WHERE pp.user_id = p.id AND pp.slug = 'about'
);

-- 3. Assign any orphaned sections (null page_id) to the user's Home page
UPDATE profile_sections ps
SET page_id = (
  SELECT pp.id FROM profile_pages pp
  WHERE pp.user_id = ps.user_id AND pp.is_home = true
  LIMIT 1
)
WHERE ps.page_id IS NULL
  AND EXISTS (
    SELECT 1 FROM profile_pages pp
    WHERE pp.user_id = ps.user_id AND pp.is_home = true
  );

-- 4. Create trigger to auto-provision pages for NEW profiles
CREATE OR REPLACE FUNCTION public.auto_provision_profile_pages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM ensure_default_home_page(NEW.id);
  RETURN NEW;
END;
$$;

-- Drop if exists to be safe
DROP TRIGGER IF EXISTS trigger_auto_provision_profile_pages ON public.profiles;

CREATE TRIGGER trigger_auto_provision_profile_pages
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_provision_profile_pages();
