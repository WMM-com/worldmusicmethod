-- Add column to store WordPress password hash for imported users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wp_password_hash TEXT;