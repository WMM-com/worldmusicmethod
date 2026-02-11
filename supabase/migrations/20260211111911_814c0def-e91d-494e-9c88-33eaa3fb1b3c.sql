
-- Add amount_paid for partial payment tracking
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0;

-- Add precise timing fields as JSONB for flexibility (soundcheck, load_in, gig_start, curfew, custom)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS precise_timings jsonb DEFAULT null;
