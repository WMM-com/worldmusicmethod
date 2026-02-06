
-- Create function to get admin user IDs for notifications
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.user_roles WHERE role = 'admin';
$$;
