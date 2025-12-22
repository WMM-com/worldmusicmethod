-- Add notification preferences columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_email_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_email_invoices BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_email_friend_requests BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_email_comments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_email_mentions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_push_events BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_push_messages BOOLEAN DEFAULT true;

-- Drop any check constraint on posts.post_type if exists
DO $$ 
DECLARE 
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN 
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'posts' 
        AND nsp.nspname = 'public'
        AND con.contype = 'c'
        AND con.conname LIKE '%post_type%'
    LOOP
        EXECUTE 'ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
    END LOOP;
END $$;