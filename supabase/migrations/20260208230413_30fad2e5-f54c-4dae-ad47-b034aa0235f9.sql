
-- Add featured image display settings to blog_posts
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS featured_image_size text DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS featured_image_position text DEFAULT 'center center';
