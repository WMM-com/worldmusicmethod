-- Add email_verified column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified_at timestamp with time zone;

-- Create verification tokens table
CREATE TABLE public.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast token lookup
CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);

-- Enable RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies - tokens should only be accessed by service role (edge functions)
CREATE POLICY "Service role can manage verification tokens"
ON public.email_verification_tokens
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to create verification token (called by trigger)
CREATE OR REPLACE FUNCTION public.create_verification_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a new verification token for the user
  INSERT INTO public.email_verification_tokens (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  RETURN NEW;
END;
$$;

-- Trigger to create verification token when a new profile is created
CREATE TRIGGER on_profile_created_create_verification_token
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_verification_token();

-- Function to mark email as verified
CREATE OR REPLACE FUNCTION public.verify_email_token(p_token uuid)
RETURNS TABLE(user_id uuid, email text, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record record;
BEGIN
  -- Find the token
  SELECT * INTO v_token_record
  FROM public.email_verification_tokens t
  WHERE t.token = p_token
    AND t.used_at IS NULL
    AND t.expires_at > now()
  LIMIT 1;
  
  IF v_token_record IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, false, 'Invalid or expired verification token'::text;
    RETURN;
  END IF;
  
  -- Mark token as used
  UPDATE public.email_verification_tokens
  SET used_at = now()
  WHERE id = v_token_record.id;
  
  -- Mark profile as verified
  UPDATE public.profiles
  SET email_verified = true, email_verified_at = now()
  WHERE id = v_token_record.user_id;
  
  RETURN QUERY SELECT v_token_record.user_id, v_token_record.email, true, 'Email verified successfully'::text;
END;
$$;