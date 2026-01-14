-- Add deleted_for_users column to conversations table for soft delete
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS deleted_for_users text[] DEFAULT '{}';

-- Add deleted_for_users column to messages table for soft delete
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS deleted_for_users text[] DEFAULT '{}';