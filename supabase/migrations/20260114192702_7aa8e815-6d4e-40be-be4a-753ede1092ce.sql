-- Fix mark_messages_read to work with messages.deleted_for_users being text[]
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id <> auth.uid()
    AND read_at IS NULL
    AND (
      deleted_for_users IS NULL
      OR NOT (deleted_for_users @> ARRAY[auth.uid()::text])
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;

-- Retract (cancel) a pending friend request and remove the recipient notification safely
CREATE OR REPLACE FUNCTION public.retract_friend_request(p_friendship_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  f record;
  deleted_friendships integer;
BEGIN
  SELECT * INTO f
  FROM public.friendships
  WHERE id = p_friendship_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Only the sender can retract, and only while pending
  IF f.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF f.status <> 'pending' THEN
    RETURN false;
  END IF;

  -- Delete the notification that was created for the recipient
  DELETE FROM public.notifications
  WHERE user_id = f.friend_id
    AND reference_type = 'friendship'
    AND reference_id = p_friendship_id
    AND type = 'friend_request';

  -- Delete the friendship row itself
  DELETE FROM public.friendships
  WHERE id = p_friendship_id;

  GET DIAGNOSTICS deleted_friendships = ROW_COUNT;
  RETURN deleted_friendships > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.retract_friend_request(uuid) TO authenticated;
