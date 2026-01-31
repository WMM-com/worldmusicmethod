-- Tighten messaging RLS policies to authenticated users only
-- (addresses warn: conversation participants could be enumerated)

-- Conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (auth.uid() = ANY (participant_ids));

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = ANY (participant_ids));

DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (auth.uid() = ANY (participant_ids));

-- Messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND auth.uid() = ANY (conversations.participant_ids)
  )
);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND auth.uid() = ANY (conversations.participant_ids)
  )
);

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can mark received messages as read" ON public.messages;
CREATE POLICY "Users can mark received messages as read"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND auth.uid() = ANY (c.participant_ids)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND auth.uid() = ANY (c.participant_ids)
  )
);
