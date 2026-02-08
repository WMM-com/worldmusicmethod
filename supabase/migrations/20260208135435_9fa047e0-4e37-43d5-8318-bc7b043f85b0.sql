
-- Add tags column to blog_posts (string array, max enforced in app)
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS tags text[] DEFAULT NULL;

-- Add deleted_at column for soft delete / trash bin
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for efficient querying of non-deleted posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_deleted_at ON public.blog_posts (deleted_at) WHERE deleted_at IS NOT NULL;

-- Function to auto-purge blog posts that have been in trash for 15+ days
CREATE OR REPLACE FUNCTION public.purge_old_trashed_blog_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.blog_posts
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '15 days';
END;
$$;

-- Create a cron-like trigger using pg_cron if available, otherwise we'll handle it in the app
-- For now, create a simple function that can be called periodically
