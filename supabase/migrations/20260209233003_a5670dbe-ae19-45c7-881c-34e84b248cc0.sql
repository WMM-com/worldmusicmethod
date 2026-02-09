
-- Add video_room_id to booking_requests for linking confirmed bookings to video rooms
ALTER TABLE public.booking_requests 
ADD COLUMN video_room_id UUID REFERENCES public.video_rooms(id);

-- Add an index for quick lookup
CREATE INDEX idx_booking_requests_video_room ON public.booking_requests(video_room_id) WHERE video_room_id IS NOT NULL;
