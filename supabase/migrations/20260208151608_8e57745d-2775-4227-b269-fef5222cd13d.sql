-- Fix: Add WITH CHECK to the UPDATE policy so toggling publish/draft works
DROP POLICY "Admins can update blog posts" ON public.blog_posts;
CREATE POLICY "Admins can update blog posts"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING (public.is_tutor(auth.uid()))
  WITH CHECK (public.is_tutor(auth.uid()));

-- Also add a SELECT policy so admins can read all posts (including drafts) in the admin panel
CREATE POLICY "Admins can read all blog posts"
  ON public.blog_posts FOR SELECT
  TO authenticated
  USING (public.is_tutor(auth.uid()));