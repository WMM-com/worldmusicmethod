-- Allow public (unauthenticated) read access to active gigs for the fan payment page
CREATE POLICY "Public can view active gigs"
ON public.merch_gigs
FOR SELECT
USING (status = 'active');