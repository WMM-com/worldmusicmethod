-- Create table for account deletion requests
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  token uuid DEFAULT gen_random_uuid(),
  status text DEFAULT 'pending',
  requested_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone,
  completed_at timestamp with time zone,
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own deletion requests"
ON public.account_deletion_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own deletion requests"
ON public.account_deletion_requests
FOR SELECT
USING (auth.uid() = user_id);