
-- Add premium feature columns
ALTER TABLE public.extended_profiles 
  ADD COLUMN has_premium_features BOOLEAN DEFAULT FALSE,
  ADD COLUMN premium_granted_by TEXT; -- 'subscription', 'admin', or NULL

-- Allow admins to update any extended profile (for granting premium)
CREATE POLICY "Admins can update any extended profile"
  ON public.extended_profiles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
