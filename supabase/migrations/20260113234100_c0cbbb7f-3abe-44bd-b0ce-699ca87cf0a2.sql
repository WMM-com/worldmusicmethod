-- Add INSERT policy for admin playlists (created by admins)
CREATE POLICY "Admins can create admin playlists" 
ON public.media_playlists 
FOR INSERT 
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- Also add UPDATE and DELETE policies for admin playlists
CREATE POLICY "Admins can update admin playlists" 
ON public.media_playlists 
FOR UPDATE 
USING (
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete admin playlists" 
ON public.media_playlists 
FOR DELETE 
USING (
  public.has_role(auth.uid(), 'admin')
);