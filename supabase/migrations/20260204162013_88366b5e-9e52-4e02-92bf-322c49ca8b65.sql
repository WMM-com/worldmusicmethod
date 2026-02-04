-- Function to generate a random 8-character alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to create referral record for new user
CREATE OR REPLACE FUNCTION public.create_user_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  -- Generate unique referral code
  LOOP
    new_code := generate_referral_code();
    SELECT EXISTS(SELECT 1 FROM referrals WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Insert referral record for the new user
  INSERT INTO referrals (referrer_id, referral_code, status, clicked_at, expires_at)
  VALUES (NEW.id, new_code, 'clicked', now(), now() + interval '10 days');
  
  -- Create user_credits record with 0 balance
  INSERT INTO user_credits (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (runs after new profile is created)
DROP TRIGGER IF EXISTS on_profile_created_create_referral ON public.profiles;
CREATE TRIGGER on_profile_created_create_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_referral();

-- Backfill existing users: Create referral codes for users who don't have one
DO $$
DECLARE
  user_record record;
  new_code text;
  code_exists boolean;
BEGIN
  FOR user_record IN 
    SELECT p.id 
    FROM profiles p 
    WHERE NOT EXISTS (SELECT 1 FROM referrals r WHERE r.referrer_id = p.id)
  LOOP
    -- Generate unique code
    LOOP
      new_code := (
        SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32 + 1)::integer, 1), '')
        FROM generate_series(1, 8)
      );
      SELECT EXISTS(SELECT 1 FROM referrals WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    -- Insert referral record
    INSERT INTO referrals (referrer_id, referral_code, status, clicked_at, expires_at)
    VALUES (user_record.id, new_code, 'clicked', now(), now() + interval '10 days');
  END LOOP;
END $$;

-- Backfill user_credits for existing users
INSERT INTO user_credits (user_id, balance)
SELECT p.id, 0
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM user_credits uc WHERE uc.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;