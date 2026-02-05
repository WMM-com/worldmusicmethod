-- Add profile_tier column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_tier TEXT DEFAULT 'basic' CHECK (profile_tier IN ('basic', 'premium'));