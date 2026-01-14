-- Fix mark_messages_read to handle NULL deleted_for_users
-- The issue is that when deleted_for_users is NULL, the @> operator returns NULL (not false)
-- which causes the WHERE condition to fail

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
    AND (deleted_for_users IS NULL OR NOT (deleted_for_users @> ARRAY[auth.uid()]));
END;
$$;

-- Also set a default for deleted_for_users to prevent NULL issues in the future
ALTER TABLE public.messages 
ALTER COLUMN deleted_for_users SET DEFAULT '{}'::uuid[];