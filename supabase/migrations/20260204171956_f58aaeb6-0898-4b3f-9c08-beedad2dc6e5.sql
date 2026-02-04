-- Create function to link a referred user to their referrer
CREATE OR REPLACE FUNCTION public.link_referred_signup(p_referral_code text, p_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referral_id UUID;
  v_referrer_id UUID;
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Find the referral by code
  SELECT id, referrer_id, status, expires_at
  INTO v_referral_id, v_referrer_id, v_status, v_expires_at
  FROM public.referrals
  WHERE referral_code = p_referral_code
  LIMIT 1;
  
  -- Check if referral exists
  IF v_referral_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral code not found');
  END IF;
  
  -- Check if expired
  IF v_expires_at < now() THEN
    -- Update status to expired
    UPDATE public.referrals
    SET status = 'expired', updated_at = now()
    WHERE id = v_referral_id;
    
    RETURN jsonb_build_object('success', false, 'error', 'Referral code has expired');
  END IF;
  
  -- Check if already used (status must be 'clicked')
  IF v_status != 'clicked' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral code already used');
  END IF;
  
  -- Prevent self-referral
  IF v_referrer_id = p_referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;
  
  -- Update the referral with the referred user
  UPDATE public.referrals
  SET 
    referred_user_id = p_referred_user_id,
    status = 'signed_up',
    signed_up_at = now(),
    updated_at = now()
  WHERE id = v_referral_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'referral_id', v_referral_id,
    'referrer_id', v_referrer_id
  );
END;
$$;