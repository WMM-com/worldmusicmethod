-- Add unsubscribe_reason to email_contacts table
ALTER TABLE public.email_contacts 
ADD COLUMN IF NOT EXISTS unsubscribe_reason TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_contacts_is_subscribed ON public.email_contacts(is_subscribed);

-- Create unsubscribe tokens table for secure unsubscribe links
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days')
);

-- Enable RLS
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- Policy for public access to verify/use tokens (for unsubscribe page)
CREATE POLICY "Anyone can verify unsubscribe tokens" 
ON public.email_unsubscribe_tokens 
FOR SELECT 
USING (true);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_email ON public.email_unsubscribe_tokens(email);