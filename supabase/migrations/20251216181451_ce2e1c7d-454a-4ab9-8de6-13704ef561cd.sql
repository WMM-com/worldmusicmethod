-- Add soft delete and time tracking columns to events
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS time_tbc BOOLEAN DEFAULT FALSE;

-- Create index for efficient filtering of non-deleted events
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON public.events(deleted_at) WHERE deleted_at IS NULL;