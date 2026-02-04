
-- Add function to award gamified signup bonus
-- Awards $10 (1000 cents) when a referrer reaches 5 successful signups
CREATE OR REPLACE FUNCTION public.check_and_award_signup_milestone(p_referrer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_signup_count INTEGER;
  v_milestone_reached INTEGER;
  v_last_milestone INTEGER;
  v_new_balance INTEGER;
  v_milestones INTEGER[] := ARRAY[5, 10, 20, 50, 100]; -- Milestone thresholds
  v_reward_cents INTEGER := 1000; -- $10 per milestone
  v_milestone INTEGER;
  v_awarded BOOLEAN := false;
  v_awarded_milestones INTEGER[] := ARRAY[]::INTEGER[];
BEGIN
  -- Count total successful signups (status = 'signed_up' or 'converted')
  SELECT COUNT(*) INTO v_signup_count
  FROM referrals
  WHERE referrer_id = p_referrer_id
    AND referred_user_id IS NOT NULL
    AND status IN ('signed_up', 'converted');
  
  -- Check which milestones have already been awarded
  -- by looking for existing transactions with the milestone reference pattern
  FOREACH v_milestone IN ARRAY v_milestones
  LOOP
    -- Check if this milestone was already awarded
    IF NOT EXISTS (
      SELECT 1 FROM credit_transactions
      WHERE user_id = p_referrer_id
        AND type = 'earned_signup_milestone'
        AND reference_id = 'milestone_' || v_milestone::TEXT
    ) THEN
      -- Milestone not yet awarded, check if reached
      IF v_signup_count >= v_milestone THEN
        -- Award the milestone bonus
        INSERT INTO credit_transactions (user_id, amount, type, description, reference_id)
        VALUES (
          p_referrer_id, 
          v_reward_cents, 
          'earned_signup_milestone',
          '$10 bonus: ' || v_milestone || ' friends signed up!',
          'milestone_' || v_milestone::TEXT
        );
        
        -- Update user_credits balance
        INSERT INTO user_credits (user_id, balance)
        VALUES (p_referrer_id, v_reward_cents)
        ON CONFLICT (user_id) 
        DO UPDATE SET balance = user_credits.balance + v_reward_cents
        RETURNING balance INTO v_new_balance;
        
        v_awarded := true;
        v_awarded_milestones := array_append(v_awarded_milestones, v_milestone);
      END IF;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'signup_count', v_signup_count,
    'milestones_awarded', v_awarded_milestones,
    'any_awarded', v_awarded,
    'new_balance', v_new_balance
  );
END;
$$;
