-- Create group_channels table for organizing content within groups
CREATE TABLE public.group_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'message-circle',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on group_channels
ALTER TABLE public.group_channels ENABLE ROW LEVEL SECURITY;

-- Group channels are viewable by group members or if group is public
CREATE POLICY "Group channels viewable by members or public groups"
ON public.group_channels
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_channels.group_id 
    AND gm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_channels.group_id
    AND g.privacy = 'public'
  )
);

-- Group admins can create channels
CREATE POLICY "Admins can create channels"
ON public.group_channels
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_channels.group_id 
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'moderator')
  )
);

-- Group admins can update channels
CREATE POLICY "Admins can update channels"
ON public.group_channels
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_channels.group_id 
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'moderator')
  )
);

-- Group admins can delete channels
CREATE POLICY "Admins can delete channels"
ON public.group_channels
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_channels.group_id 
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'moderator')
  )
);

-- Add channel_id to group_posts for organizing posts by channel
ALTER TABLE public.group_posts ADD COLUMN channel_id UUID REFERENCES public.group_channels(id) ON DELETE SET NULL;

-- Create group_questionnaires table for form-style feedback
CREATE TABLE public.group_questionnaires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.group_channels(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  allow_multiple_responses BOOLEAN DEFAULT false,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on group_questionnaires
ALTER TABLE public.group_questionnaires ENABLE ROW LEVEL SECURITY;

-- Questionnaires viewable by group members
CREATE POLICY "Questionnaires viewable by members"
ON public.group_questionnaires
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_questionnaires.group_id 
    AND gm.user_id = auth.uid()
  )
);

-- Admins can create questionnaires
CREATE POLICY "Admins can create questionnaires"
ON public.group_questionnaires
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_questionnaires.group_id 
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'moderator')
  )
);

-- Admins can update questionnaires
CREATE POLICY "Admins can update questionnaires"
ON public.group_questionnaires
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_questionnaires.group_id 
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'moderator')
  )
);

-- Admins can delete questionnaires
CREATE POLICY "Admins can delete questionnaires"
ON public.group_questionnaires
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_questionnaires.group_id 
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'moderator')
  )
);

-- Create questionnaire_responses table
CREATE TABLE public.questionnaire_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  questionnaire_id UUID NOT NULL REFERENCES public.group_questionnaires(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(questionnaire_id, user_id)
);

-- Enable RLS on questionnaire_responses
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Users can view their own responses
CREATE POLICY "Users can view own responses"
ON public.questionnaire_responses
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all responses in their groups
CREATE POLICY "Admins can view all responses"
ON public.questionnaire_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_questionnaires gq
    JOIN public.group_members gm ON gm.group_id = gq.group_id
    WHERE gq.id = questionnaire_responses.questionnaire_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'moderator')
  )
);

-- Members can submit responses
CREATE POLICY "Members can submit responses"
ON public.questionnaire_responses
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.group_questionnaires gq
    JOIN public.group_members gm ON gm.group_id = gq.group_id
    WHERE gq.id = questionnaire_responses.questionnaire_id
    AND gm.user_id = auth.uid()
  )
);

-- Users can update their own responses
CREATE POLICY "Users can update own responses"
ON public.questionnaire_responses
FOR UPDATE
USING (auth.uid() = user_id);

-- Create mentions table for @ mentions
CREATE TABLE public.mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentioned_user_id UUID NOT NULL,
  mentioned_by_user_id UUID NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  group_post_id UUID REFERENCES public.group_posts(id) ON DELETE CASCADE,
  group_comment_id UUID REFERENCES public.group_post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  CONSTRAINT mentions_content_check CHECK (
    post_id IS NOT NULL OR comment_id IS NOT NULL OR group_post_id IS NOT NULL OR group_comment_id IS NOT NULL
  )
);

-- Enable RLS on mentions
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- Users can view mentions where they are mentioned
CREATE POLICY "Users can view their mentions"
ON public.mentions
FOR SELECT
USING (auth.uid() = mentioned_user_id);

-- Users can create mentions
CREATE POLICY "Users can create mentions"
ON public.mentions
FOR INSERT
WITH CHECK (auth.uid() = mentioned_by_user_id);

-- Users can mark their mentions as read
CREATE POLICY "Users can update their mentions"
ON public.mentions
FOR UPDATE
USING (auth.uid() = mentioned_user_id);

-- Create indexes for performance
CREATE INDEX idx_group_channels_group_id ON public.group_channels(group_id);
CREATE INDEX idx_group_posts_channel_id ON public.group_posts(channel_id);
CREATE INDEX idx_group_questionnaires_group_id ON public.group_questionnaires(group_id);
CREATE INDEX idx_questionnaire_responses_questionnaire_id ON public.questionnaire_responses(questionnaire_id);
CREATE INDEX idx_mentions_mentioned_user_id ON public.mentions(mentioned_user_id);
CREATE INDEX idx_mentions_post_id ON public.mentions(post_id);
CREATE INDEX idx_mentions_group_post_id ON public.mentions(group_post_id);

-- Add updated_at triggers
CREATE TRIGGER update_group_channels_updated_at
  BEFORE UPDATE ON public.group_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_questionnaires_updated_at
  BEFORE UPDATE ON public.group_questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questionnaire_responses_updated_at
  BEFORE UPDATE ON public.questionnaire_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();