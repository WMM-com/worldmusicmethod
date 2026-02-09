-- Add username_change_count to profiles to track how many times a user has changed their username
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_change_count integer NOT NULL DEFAULT 0;

-- Update the change_username function to implement one-retry logic:
-- First time setting: no cooldown
-- Second time (free retry): no cooldown
-- Third time onwards: 30-day cooldown applies
CREATE OR REPLACE FUNCTION public.change_username(p_new_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_old_username TEXT;
  v_last_change TIMESTAMPTZ;
  v_days_since INTEGER;
  v_cooldown_days INTEGER := 30;
  v_clean_username TEXT;
  v_change_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Clean the username
  v_clean_username := lower(trim(p_new_username));
  
  -- Validate format
  IF v_clean_username !~ '^[a-z][a-z0-9_-]{2,29}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username must be 3-30 characters, start with a letter, and only contain letters, numbers, hyphens, and underscores.');
  END IF;

  -- Block reserved words
  IF v_clean_username IN ('admin', 'profile', 'settings', 'dashboard', 'login', 'signup', 'auth', 'api', 'help', 'support', 'about', 'contact', 'home', 'search', 'explore', 'messages', 'notifications', 'media', 'courses', 'events', 'social', 'meet', 'membership', 'cart', 'checkout', 'invoices', 'expenses', 'finances', 'documents', 'groups', 'community') THEN
    RETURN jsonb_build_object('success', false, 'error', 'This username is reserved and cannot be used.');
  END IF;

  -- Get current username, last change timestamp, and change count
  SELECT username, last_username_change, username_change_count 
  INTO v_old_username, v_last_change, v_change_count
  FROM profiles WHERE id = v_user_id;

  -- If same username, no-op
  IF v_old_username = v_clean_username THEN
    RETURN jsonb_build_object('success', true, 'username', v_clean_username, 'message', 'Username unchanged');
  END IF;

  -- Cooldown logic:
  -- change_count 0 = first time setting (no cooldown)
  -- change_count 1 = free retry (no cooldown)
  -- change_count >= 2 = cooldown applies
  IF v_change_count >= 2 AND v_last_change IS NOT NULL THEN
    v_days_since := EXTRACT(EPOCH FROM (now() - v_last_change)) / 86400;
    IF v_days_since < v_cooldown_days THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'You can only change your username once every ' || v_cooldown_days || ' days. ' ||
                 'You can change it again in ' || (v_cooldown_days - v_days_since) || ' days.'
      );
    END IF;
  END IF;

  -- Check if the new username is already taken
  IF EXISTS (SELECT 1 FROM profiles WHERE username = v_clean_username AND id != v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This username is already taken.');
  END IF;

  -- Check if username was recently used by someone else (prevent hijacking)
  IF EXISTS (
    SELECT 1 FROM username_history 
    WHERE old_username = v_clean_username 
    AND user_id != v_user_id
    AND changed_at > now() - INTERVAL '90 days'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This username was recently used by another user and is temporarily unavailable.');
  END IF;

  -- Record history (only if old username existed)
  IF v_old_username IS NOT NULL THEN
    INSERT INTO username_history (user_id, old_username, new_username)
    VALUES (v_user_id, v_old_username, v_clean_username);
  END IF;

  -- Update the username and increment change count
  UPDATE profiles 
  SET username = v_clean_username, 
      last_username_change = now(),
      username_change_count = COALESCE(username_change_count, 0) + 1
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'username', v_clean_username, 
    'old_username', v_old_username,
    'change_count', COALESCE(v_change_count, 0) + 1,
    'message', CASE 
      WHEN v_old_username IS NULL THEN 'Username set successfully. You have one free retry to change it again.'
      WHEN COALESCE(v_change_count, 0) = 0 THEN 'Username set successfully. You have one free retry to change it again.'
      WHEN COALESCE(v_change_count, 0) = 1 THEN 'Username updated. You won''t be able to change it again for 30 days.'
      ELSE 'Username changed. Old URL will redirect for 90 days.'
    END
  );
END;
$function$;

-- Backfill existing users: set username_change_count based on username_history
UPDATE profiles p
SET username_change_count = COALESCE(sub.cnt, 0) + (CASE WHEN p.username IS NOT NULL THEN 1 ELSE 0 END)
FROM (
  SELECT user_id, COUNT(*) as cnt
  FROM username_history
  GROUP BY user_id
) sub
WHERE p.id = sub.user_id;

-- For users with a username but no history entries, set count to 1
UPDATE profiles
SET username_change_count = 1
WHERE username IS NOT NULL AND username_change_count = 0;