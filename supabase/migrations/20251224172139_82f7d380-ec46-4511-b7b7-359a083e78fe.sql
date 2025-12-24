-- Add WordPress user ID field for migration mapping
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wp_user_id integer UNIQUE;