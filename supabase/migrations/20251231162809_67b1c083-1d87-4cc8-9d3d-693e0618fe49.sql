-- Add UPDATE policy for group_polls so admins can pin/update polls
CREATE POLICY "Admins can update polls"
ON public.group_polls
FOR UPDATE
USING (is_group_admin(group_id, auth.uid()));