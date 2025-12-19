-- Create friendships table FIRST
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CONSTRAINT different_users CHECK (user_id != friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send friend requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can update friendships they receive"
ON public.friendships FOR UPDATE
USING (auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships"
ON public.friendships FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create security definer function to check friendship
CREATE OR REPLACE FUNCTION public.are_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND ((user_id = user1_id AND friend_id = user2_id)
      OR (user_id = user2_id AND friend_id = user1_id))
  )
$$;

-- Now create posts table
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  image_url text,
  visibility text NOT NULL DEFAULT 'friends',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create posts"
ON public.posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
ON public.posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
ON public.posts FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own posts"
ON public.posts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public posts"
ON public.posts FOR SELECT
USING (visibility = 'public');

CREATE POLICY "Friends can view friends posts"
ON public.posts FOR SELECT
USING (visibility = 'friends' AND public.are_friends(posts.user_id, auth.uid()));

-- Create comments table
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create comments"
ON public.comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
ON public.comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.comments FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view comments"
ON public.comments FOR SELECT
USING (true);

-- Create appreciations table
CREATE TABLE public.appreciations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT appreciation_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Create unique indexes for appreciations
CREATE UNIQUE INDEX idx_appreciation_post ON public.appreciations(user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX idx_appreciation_comment ON public.appreciations(user_id, comment_id) WHERE comment_id IS NOT NULL;

ALTER TABLE public.appreciations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can appreciate"
ON public.appreciations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove appreciation"
ON public.appreciations FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view appreciations"
ON public.appreciations FOR SELECT
USING (true);

-- Performance indexes
CREATE INDEX idx_posts_user ON public.posts(user_id);
CREATE INDEX idx_posts_time ON public.posts(created_at DESC);
CREATE INDEX idx_comments_post ON public.comments(post_id);
CREATE INDEX idx_friendships_user ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend ON public.friendships(friend_id);

-- Add avatar to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;