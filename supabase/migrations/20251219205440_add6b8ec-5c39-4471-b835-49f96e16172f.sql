-- Add pinned audio table for community sections
CREATE TABLE public.pinned_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text,
  audio_url text NOT NULL,
  cover_image_url text,
  section text NOT NULL DEFAULT 'general', -- general, group_header, profile
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pinned_audio ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view pinned audio" ON public.pinned_audio
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage own pinned audio" ON public.pinned_audio
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Group admins can manage group pinned audio" ON public.pinned_audio
  FOR ALL USING (
    group_id IS NOT NULL AND is_group_admin(group_id, auth.uid())
  );

-- Enable realtime for group posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_post_comments;