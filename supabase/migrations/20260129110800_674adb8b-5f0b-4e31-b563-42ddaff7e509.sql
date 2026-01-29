-- Clean up duplicate policies on profiles table
-- Keep only the comprehensive policy that covers all cases

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;