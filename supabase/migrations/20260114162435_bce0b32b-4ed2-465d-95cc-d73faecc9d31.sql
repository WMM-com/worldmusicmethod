-- Fix mark_messages_read function - ensure it properly bypasses RLS
-- by granting it appropriate permissions
DROP FUNCTION IF EXISTS public.mark_messages_read(uuid);

CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Update all unread messages in this conversation that were NOT sent by the current user
  UPDATE public.messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND read_at IS NULL
    AND (deleted_for_users IS NULL OR NOT (deleted_for_users @> ARRAY[auth.uid()]::uuid[]));
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;

-- Also add a policy that allows participants to update read_at on messages they receive
DROP POLICY IF EXISTS "Users can mark received messages as read" ON public.messages;

CREATE POLICY "Users can mark received messages as read"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND auth.uid() = ANY(c.participant_ids)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND auth.uid() = ANY(c.participant_ids)
  )
);