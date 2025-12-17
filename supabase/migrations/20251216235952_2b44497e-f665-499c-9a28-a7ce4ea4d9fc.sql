-- Add is_publicly_shared column to events table (defaults to false for security)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_publicly_shared BOOLEAN DEFAULT FALSE;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view shared events" ON public.events;

-- Create a new policy that requires explicit sharing intent
CREATE POLICY "Public can view explicitly shared events" 
ON public.events 
FOR SELECT 
USING (share_token IS NOT NULL AND is_publicly_shared = TRUE);