-- Drop and recreate the mark_messages_read function with correct implementation
DROP FUNCTION IF EXISTS public.mark_messages_read(uuid);

CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND read_at IS NULL
    AND NOT (deleted_for_users @> ARRAY[auth.uid()]);
END;
$$;