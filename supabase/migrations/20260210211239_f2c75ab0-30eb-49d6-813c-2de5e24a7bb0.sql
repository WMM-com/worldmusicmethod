
-- Allow admins to insert extended_profiles for any user
CREATE POLICY "Admins can insert any extended profile"
ON public.extended_profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete extended_profiles (for cleanup)
CREATE POLICY "Admins can delete any extended profile"
ON public.extended_profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
