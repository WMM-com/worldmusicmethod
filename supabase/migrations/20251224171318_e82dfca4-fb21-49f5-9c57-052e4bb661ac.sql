-- Add admin delete policies for posts
CREATE POLICY "Admins can delete any post"
ON public.posts
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add admin delete policies for comments
CREATE POLICY "Admins can delete any comment"
ON public.comments
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add admin delete policies for groups
CREATE POLICY "Admins can delete any group"
ON public.groups
FOR DELETE
USING (has_role(auth.uid(), 'admin'));