-- Fix 1: PayPal pending orders - restrict to service role only
DROP POLICY IF EXISTS "Service role can manage pending orders" ON public.paypal_pending_orders;

CREATE POLICY "Service role only access"
ON public.paypal_pending_orders FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Fix 2: Profiles table - create secure public view and fix RLS
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view public profiles" ON public.profiles;

-- Create a safe public view that excludes sensitive data
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT 
  id, 
  full_name,
  first_name,
  last_name,
  bio, 
  avatar_url, 
  cover_image_url, 
  profile_type, 
  tagline, 
  website_url, 
  social_links,
  is_public,
  created_at,
  business_name
FROM public.profiles
WHERE is_public = true;

-- Grant SELECT on the view to authenticated and anonymous users
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Add policy for users to view their own full profile (sensitive data included)
CREATE POLICY "Users view own full profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Add policy for authenticated users to view public profiles (limited data via view)
-- The view already filters columns, so this policy allows the view to work
CREATE POLICY "Authenticated users can view public profiles via view"
ON public.profiles FOR SELECT
USING (is_public = true AND auth.role() IN ('authenticated', 'anon'));