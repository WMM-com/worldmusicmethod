-- Create a table for one-time auth tokens used after payment
CREATE TABLE IF NOT EXISTS public.payment_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),
  used_at TIMESTAMP WITH TIME ZONE NULL
);

-- Enable RLS (no policies needed - only edge functions with service role access this)
ALTER TABLE public.payment_auth_tokens ENABLE ROW LEVEL SECURITY;

-- Create function to generate and return a one-time auth token
CREATE OR REPLACE FUNCTION public.create_payment_auth_token(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Clean up expired tokens
  DELETE FROM public.payment_auth_tokens WHERE expires_at < now();
  
  -- Generate new token
  v_token := encode(gen_random_bytes(32), 'hex');
  
  INSERT INTO public.payment_auth_tokens (user_id, token)
  VALUES (p_user_id, v_token);
  
  RETURN v_token;
END;
$$;

-- Create function to consume a one-time auth token and return user_id
CREATE OR REPLACE FUNCTION public.consume_payment_auth_token(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find and consume valid token
  UPDATE public.payment_auth_tokens
  SET used_at = now()
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now()
  RETURNING user_id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$;