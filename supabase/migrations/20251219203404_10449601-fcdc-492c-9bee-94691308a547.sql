-- Create enum for group privacy levels
CREATE TYPE public.group_privacy AS ENUM ('public', 'private', 'secret');

-- Create enum for group categories
CREATE TYPE public.group_category AS ENUM (
  'genre', 'instrument', 'collaboration', 'learning', 
  'networking', 'local', 'production', 'other'
);

-- Create enum for group member roles
CREATE TYPE public.group_member_role AS ENUM ('admin', 'moderator', 'member');

-- Create groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  category group_category NOT NULL DEFAULT 'other',
  subcategory TEXT, -- e.g., "Jazz" for genre, "Guitar" for instrument
  privacy group_privacy NOT NULL DEFAULT 'public',
  location TEXT, -- for local groups
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role group_member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group_posts table
CREATE TABLE public.group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT, -- 'image', 'audio', 'video'
  is_pinned BOOLEAN DEFAULT false,
  is_announcement BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_post_comments table
CREATE TABLE public.group_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_join_requests table (for private groups)
CREATE TABLE public.group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(group_id, user_id)
);

-- Create group_invites table (for secret groups)
CREATE TABLE public.group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  invited_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, invited_user_id)
);

-- Create group_events table
CREATE TABLE public.group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT, -- 'rehearsal', 'gig', 'jam_session', 'workshop', 'meetup'
  location TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_polls table
CREATE TABLE public.group_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  ends_at TIMESTAMP WITH TIME ZONE,
  is_multiple_choice BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_poll_votes table
CREATE TABLE public.group_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.group_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id, option_index)
);

-- Enable RLS on all tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_poll_votes ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a group member
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  )
$$;

-- Helper function to check if user is group admin/moderator
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id 
    AND user_id = p_user_id 
    AND role IN ('admin', 'moderator')
  )
$$;

-- Groups policies
CREATE POLICY "Anyone can view public groups"
  ON public.groups FOR SELECT
  USING (privacy = 'public');

CREATE POLICY "Members can view private groups"
  ON public.groups FOR SELECT
  USING (privacy = 'private' AND is_group_member(id, auth.uid()));

CREATE POLICY "Members can view secret groups"
  ON public.groups FOR SELECT
  USING (privacy = 'secret' AND is_group_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON public.groups FOR UPDATE
  USING (is_group_admin(id, auth.uid()));

CREATE POLICY "Group creator can delete groups"
  ON public.groups FOR DELETE
  USING (auth.uid() = created_by);

-- Group members policies
CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT
  USING (is_group_member(group_id, auth.uid()) OR EXISTS (
    SELECT 1 FROM public.groups WHERE id = group_id AND privacy = 'public'
  ));

CREATE POLICY "Users can join public groups"
  ON public.group_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND privacy = 'public')
  );

CREATE POLICY "Admins can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (is_group_admin(group_id, auth.uid()));

CREATE POLICY "Users can leave groups"
  ON public.group_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can remove members"
  ON public.group_members FOR DELETE
  USING (is_group_admin(group_id, auth.uid()));

CREATE POLICY "Admins can update member roles"
  ON public.group_members FOR UPDATE
  USING (is_group_admin(group_id, auth.uid()));

-- Group posts policies
CREATE POLICY "Members can view group posts"
  ON public.group_posts FOR SELECT
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Members can create posts"
  ON public.group_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_group_member(group_id, auth.uid()));

CREATE POLICY "Authors can update their posts"
  ON public.group_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any post"
  ON public.group_posts FOR UPDATE
  USING (is_group_admin(group_id, auth.uid()));

CREATE POLICY "Authors can delete their posts"
  ON public.group_posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any post"
  ON public.group_posts FOR DELETE
  USING (is_group_admin(group_id, auth.uid()));

-- Group post comments policies
CREATE POLICY "Members can view comments"
  ON public.group_post_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_posts gp 
    WHERE gp.id = post_id AND is_group_member(gp.group_id, auth.uid())
  ));

CREATE POLICY "Members can create comments"
  ON public.group_post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.group_posts gp 
    WHERE gp.id = post_id AND is_group_member(gp.group_id, auth.uid())
  ));

CREATE POLICY "Authors can delete their comments"
  ON public.group_post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Join requests policies
CREATE POLICY "Admins can view join requests"
  ON public.group_join_requests FOR SELECT
  USING (is_group_admin(group_id, auth.uid()));

CREATE POLICY "Users can view their own requests"
  ON public.group_join_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can request to join"
  ON public.group_join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update requests"
  ON public.group_join_requests FOR UPDATE
  USING (is_group_admin(group_id, auth.uid()));

-- Invites policies
CREATE POLICY "Invited users can view their invites"
  ON public.group_invites FOR SELECT
  USING (auth.uid() = invited_user_id);

CREATE POLICY "Admins can view group invites"
  ON public.group_invites FOR SELECT
  USING (is_group_admin(group_id, auth.uid()));

CREATE POLICY "Admins can create invites"
  ON public.group_invites FOR INSERT
  WITH CHECK (is_group_admin(group_id, auth.uid()));

CREATE POLICY "Invited users can update their invites"
  ON public.group_invites FOR UPDATE
  USING (auth.uid() = invited_user_id);

-- Group events policies
CREATE POLICY "Members can view group events"
  ON public.group_events FOR SELECT
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Members can create events"
  ON public.group_events FOR INSERT
  WITH CHECK (auth.uid() = created_by AND is_group_member(group_id, auth.uid()));

CREATE POLICY "Creators can update their events"
  ON public.group_events FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their events"
  ON public.group_events FOR DELETE
  USING (auth.uid() = created_by);

-- Group polls policies
CREATE POLICY "Members can view polls"
  ON public.group_polls FOR SELECT
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Members can create polls"
  ON public.group_polls FOR INSERT
  WITH CHECK (auth.uid() = created_by AND is_group_member(group_id, auth.uid()));

CREATE POLICY "Creators can delete their polls"
  ON public.group_polls FOR DELETE
  USING (auth.uid() = created_by);

-- Poll votes policies
CREATE POLICY "Members can view votes"
  ON public.group_poll_votes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_polls gp 
    WHERE gp.id = poll_id AND is_group_member(gp.group_id, auth.uid())
  ));

CREATE POLICY "Members can vote"
  ON public.group_poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.group_polls gp 
    WHERE gp.id = poll_id AND is_group_member(gp.group_id, auth.uid())
  ));

CREATE POLICY "Users can remove their votes"
  ON public.group_poll_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Add RLS policy to profiles for public viewing (for member directory)
CREATE POLICY "Anyone can view basic profiles"
  ON public.profiles FOR SELECT
  USING (true);