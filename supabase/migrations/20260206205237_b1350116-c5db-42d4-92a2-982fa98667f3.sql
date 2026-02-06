
-- Add sidebar_enabled column to profile_pages, default false (full-width by default)
ALTER TABLE public.profile_pages
ADD COLUMN sidebar_enabled boolean NOT NULL DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN public.profile_pages.sidebar_enabled IS 'When true, shows a right sidebar on this page for embed sections';
