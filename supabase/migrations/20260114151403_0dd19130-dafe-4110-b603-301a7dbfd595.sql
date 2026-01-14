-- Remove availability templates feature
DROP TABLE IF EXISTS public.availability_templates;

-- Soft-delete a message for the current user only (hide it from their view)
CREATE OR REPLACE FUNCTION public.soft_delete_message(message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF message_id IS NULL THEN
    RETURN false;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Ensure caller is a participant in the conversation containing this message
  IF NOT EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id
      AND auth.uid() = ANY(c.participant_ids)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.messages m
  SET deleted_for_users = (
    SELECT ARRAY(
      SELECT DISTINCT e
      FROM unnest(coalesce(m.deleted_for_users, '{}'::text[]) || ARRAY[auth.uid()::text]) e
    )
  )
  WHERE m.id = message_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_message(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_message(uuid) TO authenticated;
