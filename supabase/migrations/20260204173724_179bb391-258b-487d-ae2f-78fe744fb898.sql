-- Function to award referral credits atomically
CREATE OR REPLACE FUNCTION public.award_referral_credit(
  p_referrer_id UUID,
  p_referred_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_reference_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Insert credit transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, reference_id)
  VALUES (p_referrer_id, p_amount, 'earned_referral', p_description, p_reference_id);

  -- Update or insert user_credits
  INSERT INTO user_credits (user_id, balance)
  VALUES (p_referrer_id, p_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET balance = user_credits.balance + p_amount
  RETURNING balance INTO v_new_balance;

  -- Update referral status to converted
  UPDATE referrals
  SET status = 'converted'
  WHERE referred_user_id = p_referred_user_id
    AND referrer_id = p_referrer_id
    AND status = 'signed_up';

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'amount_awarded', p_amount
  );
END;
$$;