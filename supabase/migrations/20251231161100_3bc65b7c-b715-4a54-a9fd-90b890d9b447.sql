-- Add channel_id to group_polls for channel-specific polls
ALTER TABLE public.group_polls ADD COLUMN IF NOT EXISTS channel_id uuid REFERENCES public.group_channels(id) ON DELETE SET NULL;

-- Add is_pinned to group_polls
ALTER TABLE public.group_polls ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Add is_pinned to group_questionnaires  
ALTER TABLE public.group_questionnaires ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Create indexes for efficient channel filtering
CREATE INDEX IF NOT EXISTS idx_group_polls_channel_id ON public.group_polls(channel_id);
CREATE INDEX IF NOT EXISTS idx_group_questionnaires_channel_id ON public.group_questionnaires(channel_id);
CREATE INDEX IF NOT EXISTS idx_group_polls_is_pinned ON public.group_polls(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_group_questionnaires_is_pinned ON public.group_questionnaires(is_pinned) WHERE is_pinned = true;

-- Update RLS policies for group_polls to allow public viewing of public group polls
DROP POLICY IF EXISTS "Members can view polls" ON public.group_polls;
CREATE POLICY "Anyone can view public group polls" ON public.group_polls
FOR SELECT USING (
  is_group_member(group_id, auth.uid()) OR 
  EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND g.privacy = 'public')
);

-- Update RLS policies for group_posts to allow public viewing of public group posts  
DROP POLICY IF EXISTS "Members can view group posts" ON public.group_posts;
CREATE POLICY "Anyone can view public group posts" ON public.group_posts
FOR SELECT USING (
  is_group_member(group_id, auth.uid()) OR
  EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND g.privacy = 'public')
);

-- Update RLS policies for group_questionnaires to allow public viewing of public group questionnaires
DROP POLICY IF EXISTS "Members can view questionnaires" ON public.group_questionnaires;
CREATE POLICY "Anyone can view public group questionnaires" ON public.group_questionnaires
FOR SELECT USING (
  is_group_member(group_id, auth.uid()) OR
  EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND g.privacy = 'public')
);

-- Update RLS for media_playlists to make admin playlists public
DROP POLICY IF EXISTS "Users can view own playlists" ON public.media_playlists;
DROP POLICY IF EXISTS "Public playlists are viewable by everyone" ON public.media_playlists;
CREATE POLICY "Public playlists are viewable by everyone" ON public.media_playlists
FOR SELECT USING (is_public = true OR auth.uid() = user_id);

-- Update groups RLS to allow public viewing of public groups without login
DROP POLICY IF EXISTS "Anyone can view public groups" ON public.groups;
CREATE POLICY "Anyone can view public groups" ON public.groups
FOR SELECT USING (privacy = 'public' OR is_group_member(id, auth.uid()));