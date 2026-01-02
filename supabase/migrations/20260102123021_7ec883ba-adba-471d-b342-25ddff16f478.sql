-- Fix the overly permissive RLS policy on profiles table
-- Remove the policy that allows anyone to view ALL profile data
DROP POLICY IF EXISTS "Anyone can view basic profiles" ON public.profiles;

-- The following policies already exist and provide proper access:
-- 1. "Users can view own profile" - auth.uid() = id
-- 2. "Public can view public profiles" - is_public = true
-- These are sufficient for the application's needs