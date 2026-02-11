-- Recreate the trigger for auto-creating profiles on new user signup
-- The function handle_new_user already exists, just the trigger is missing
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also fix the missing profile and user_role for edd@eddbateman.com
INSERT INTO public.profiles (id, email, full_name)
VALUES ('ef478600-09cd-4ce2-b33f-941e4628e77d', 'edd@eddbateman.com', 'Test User Edd')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('ef478600-09cd-4ce2-b33f-941e4628e77d', 'user')
ON CONFLICT (user_id, role) DO NOTHING;