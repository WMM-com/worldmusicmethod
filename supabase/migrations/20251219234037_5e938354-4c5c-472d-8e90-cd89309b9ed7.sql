-- Add post_type column to posts table
ALTER TABLE public.posts 
ADD COLUMN post_type text DEFAULT 'update' CHECK (post_type IN ('statement', 'update', 'recommendation'));