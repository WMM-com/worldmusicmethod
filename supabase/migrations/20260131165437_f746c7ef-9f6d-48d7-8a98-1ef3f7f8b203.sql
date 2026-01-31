-- Add token, status, and last_error columns to video_rooms
ALTER TABLE public.video_rooms
ADD COLUMN token TEXT,
ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'error')),
ADD COLUMN last_error TEXT;

-- Add index for status queries
CREATE INDEX idx_video_rooms_status ON public.video_rooms(status);

-- Comment for documentation
COMMENT ON COLUMN public.video_rooms.token IS 'Generated Agora token for the room (cached for quick rejoin)';
COMMENT ON COLUMN public.video_rooms.status IS 'Room status: pending (created but token not generated), ready (token generated), error (token generation failed)';
COMMENT ON COLUMN public.video_rooms.last_error IS 'Last error message if token generation failed';