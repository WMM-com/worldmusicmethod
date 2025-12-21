-- Note: We cannot remove enum values in PostgreSQL, but we can update any staff roles to user
UPDATE public.user_roles SET role = 'user' WHERE role = 'staff';