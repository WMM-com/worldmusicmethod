
-- Create a server-side function for admin user search
-- This bypasses PostgREST filter parsing issues with special characters
CREATE OR REPLACE FUNCTION public.admin_search_profiles(
  search_term text DEFAULT '',
  page_offset int DEFAULT 0,
  page_limit int DEFAULT 50
)
RETURNS SETOF profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM profiles
  WHERE
    -- Only admins can use this function
    has_role(auth.uid(), 'admin')
    AND (
      search_term = ''
      OR email ILIKE '%' || search_term || '%'
      OR full_name ILIKE '%' || search_term || '%'
    )
  ORDER BY created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
$$;

-- Create a count function for pagination
CREATE OR REPLACE FUNCTION public.admin_count_profiles(
  search_term text DEFAULT ''
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)
  FROM profiles
  WHERE
    has_role(auth.uid(), 'admin')
    AND (
      search_term = ''
      OR email ILIKE '%' || search_term || '%'
      OR full_name ILIKE '%' || search_term || '%'
    );
$$;
