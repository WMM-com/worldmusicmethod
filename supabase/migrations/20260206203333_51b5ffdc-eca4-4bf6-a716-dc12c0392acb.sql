
-- Update the ensure_default_home_page function to also create an About page
CREATE OR REPLACE FUNCTION public.ensure_default_home_page(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_home_page_id UUID;
  v_about_page_id UUID;
BEGIN
  -- Check if home page exists
  SELECT id INTO v_home_page_id
  FROM profile_pages
  WHERE user_id = p_user_id AND is_home = true
  LIMIT 1;

  -- Create home page if it doesn't exist
  IF v_home_page_id IS NULL THEN
    INSERT INTO profile_pages (user_id, title, slug, order_index, is_home, is_visible)
    VALUES (p_user_id, 'Home', 'home', 0, true, true)
    RETURNING id INTO v_home_page_id;
  END IF;

  -- Check if about page exists
  SELECT id INTO v_about_page_id
  FROM profile_pages
  WHERE user_id = p_user_id AND slug = 'about'
  LIMIT 1;

  -- Create about page if it doesn't exist
  IF v_about_page_id IS NULL THEN
    INSERT INTO profile_pages (user_id, title, slug, order_index, is_home, is_visible)
    VALUES (p_user_id, 'About', 'about', 1, false, true)
    RETURNING id INTO v_about_page_id;
  END IF;

  RETURN v_home_page_id;
END;
$$;

-- Provision About pages for ALL existing users who have a Home page but no About page
INSERT INTO profile_pages (user_id, title, slug, order_index, is_home, is_visible)
SELECT pp.user_id, 'About', 'about', 1, false, true
FROM profile_pages pp
WHERE pp.is_home = true
  AND NOT EXISTS (
    SELECT 1 FROM profile_pages pp2
    WHERE pp2.user_id = pp.user_id AND pp2.slug = 'about'
  );
