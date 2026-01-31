-- Drop partial objects from failed migration
DROP TABLE IF EXISTS public.room_participants CASCADE;
DROP TABLE IF EXISTS public.video_rooms CASCADE;
DROP FUNCTION IF EXISTS public.is_tutor(UUID);
DROP FUNCTION IF EXISTS public.is_room_participant(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_room_host(UUID, UUID);

-- Create video_rooms table
CREATE TABLE public.video_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  type TEXT NOT NULL CHECK (type IN ('group', '1on1')),
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create room_participants table to track invitations
CREATE TABLE public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.video_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.video_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is a tutor (admin role only)
CREATE OR REPLACE FUNCTION public.is_tutor(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
    AND role = 'admin'
  )
$$;

-- Security definer function to check if user is invited to a room
CREATE OR REPLACE FUNCTION public.is_room_participant(p_user_id UUID, p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE user_id = p_user_id AND room_id = p_room_id
  )
$$;

-- Security definer function to check if user is room host
CREATE OR REPLACE FUNCTION public.is_room_host(p_user_id UUID, p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.video_rooms
    WHERE id = p_room_id AND host_user_id = p_user_id
  )
$$;

-- RLS Policies for video_rooms

-- Tutors can insert new rooms (they become the host)
CREATE POLICY "Tutors can create rooms"
ON public.video_rooms
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_tutor(auth.uid()) AND host_user_id = auth.uid()
);

-- Hosts can update their own rooms
CREATE POLICY "Hosts can update their rooms"
ON public.video_rooms
FOR UPDATE
TO authenticated
USING (host_user_id = auth.uid())
WITH CHECK (host_user_id = auth.uid());

-- Users can read rooms they host or are invited to
CREATE POLICY "Users can read rooms they participate in"
ON public.video_rooms
FOR SELECT
TO authenticated
USING (
  host_user_id = auth.uid() 
  OR public.is_room_participant(auth.uid(), id)
);

-- Hosts can delete their rooms
CREATE POLICY "Hosts can delete their rooms"
ON public.video_rooms
FOR DELETE
TO authenticated
USING (host_user_id = auth.uid());

-- RLS Policies for room_participants

-- Room hosts can invite participants
CREATE POLICY "Hosts can invite participants"
ON public.room_participants
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_room_host(auth.uid(), room_id)
);

-- Room hosts can remove participants
CREATE POLICY "Hosts can remove participants"
ON public.room_participants
FOR DELETE
TO authenticated
USING (
  public.is_room_host(auth.uid(), room_id)
);

-- Participants can update their own record (e.g., joined_at)
CREATE POLICY "Participants can update own record"
ON public.room_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can see participants in rooms they're part of
CREATE POLICY "Users can see room participants"
ON public.room_participants
FOR SELECT
TO authenticated
USING (
  public.is_room_host(auth.uid(), room_id)
  OR public.is_room_participant(auth.uid(), room_id)
);

-- Trigger to update updated_at
CREATE TRIGGER update_video_rooms_updated_at
BEFORE UPDATE ON public.video_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to deactivate expired rooms
CREATE OR REPLACE FUNCTION public.deactivate_expired_rooms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.video_rooms
  SET is_active = false
  WHERE is_active = true
  AND expires_at < now();
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_video_rooms_host ON public.video_rooms(host_user_id);
CREATE INDEX idx_video_rooms_active ON public.video_rooms(is_active) WHERE is_active = true;
CREATE INDEX idx_video_rooms_expires ON public.video_rooms(expires_at) WHERE is_active = true;
CREATE INDEX idx_room_participants_room ON public.room_participants(room_id);
CREATE INDEX idx_room_participants_user ON public.room_participants(user_id);

-- Enable realtime for video rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;