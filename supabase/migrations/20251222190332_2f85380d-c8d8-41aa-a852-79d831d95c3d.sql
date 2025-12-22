-- Add 'expert' to the app_role enum for tutors
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'expert';