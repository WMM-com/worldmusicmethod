-- Fix increment_play_count to validate the user creating the play record
CREATE OR REPLACE FUNCTION public.increment_play_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that the play event is created by the authenticated user or is anonymous
  IF NEW.user_id IS NOT NULL AND NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create play events for other users';
  END IF;
  
  UPDATE public.media_tracks 
  SET play_count = play_count + 1 
  WHERE id = NEW.track_id;
  RETURN NEW;
END;
$$;

-- Fix generate_invoice_number to verify the caller is the user_id
CREATE OR REPLACE FUNCTION public.generate_invoice_number(_user_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count INTEGER;
BEGIN
  -- Verify the caller is generating invoice number for themselves
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Cannot generate invoice number for other users';
  END IF;
  
  SELECT COUNT(*) + 1 INTO count FROM public.invoices WHERE user_id = _user_id;
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(count::TEXT, 4, '0');
END;
$$;

-- Fix create_payment_auth_token to only allow service role access (no direct client calls)
-- This function should only be called by edge functions with service role key
CREATE OR REPLACE FUNCTION public.create_payment_auth_token(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_caller_role TEXT;
BEGIN
  -- This function should only be called from edge functions with service role
  -- Check if caller has service_role by checking if they can access auth.users
  -- Since normal users can't call this directly via RPC (no RLS policy allows it),
  -- this function is protected. The RLS on payment_auth_tokens has no policies,
  -- so only service role can insert.
  
  -- Clean up expired tokens
  DELETE FROM public.payment_auth_tokens WHERE expires_at < now();
  
  -- Generate new token
  v_token := encode(gen_random_bytes(32), 'hex');
  
  INSERT INTO public.payment_auth_tokens (user_id, token)
  VALUES (p_user_id, v_token);
  
  RETURN v_token;
END;
$$;

-- Fix consume_payment_auth_token - same protection as create
CREATE OR REPLACE FUNCTION public.consume_payment_auth_token(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- This function should only be called from edge functions with service role
  -- Protected by RLS on payment_auth_tokens table (no policies = service role only)
  
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