-- Drop existing UPDATE and DELETE policies
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;

-- Create new policies with 3-day time window
CREATE POLICY "Users can update their own reviews within 3 days"
ON public.reviews
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND created_at > now() - interval '3 days'
)
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can delete their own reviews within 3 days"
ON public.reviews
FOR DELETE
USING (
  auth.uid() = user_id 
  AND created_at > now() - interval '3 days'
);