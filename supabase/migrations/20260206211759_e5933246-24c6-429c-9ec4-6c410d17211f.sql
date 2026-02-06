
-- 1. Add cooldown column to profiles (username already lives here with unique constraint profiles_username_key)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_username_change TIMESTAMPTZ DEFAULT now();

-- 2. Add an index on username for fast lookups (unique constraint already exists but let's be explicit)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 3. History table for old usernames → enables 301 redirects for SEO
CREATE TABLE public.username_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_username TEXT NOT NULL,
  new_username TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast redirect lookups by old username
CREATE INDEX idx_username_history_old_username ON public.username_history(old_username);

-- 4. RLS: publicly readable for redirect resolution, users manage own history
ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for redirects"
  ON public.username_history FOR SELECT
  USING (true);

CREATE POLICY "Users insert own history"
  ON public.username_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. DB function to safely change username with cooldown + history tracking
CREATE OR REPLACE FUNCTION public.change_username(p_new_username TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_old_username TEXT;
  v_last_change TIMESTAMPTZ;
  v_days_since INTEGER;
  v_cooldown_days INTEGER := 30;
  v_clean_username TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Clean the username: lowercase, trim, remove special chars except hyphens/underscores
  v_clean_username := lower(trim(p_new_username));
  
  -- Validate format: 3-30 chars, alphanumeric + hyphens + underscores, must start with letter
  IF v_clean_username !~ '^[a-z][a-z0-9_-]{2,29}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username must be 3-30 characters, start with a letter, and only contain letters, numbers, hyphens, and underscores.');
  END IF;

  -- Block reserved words
  IF v_clean_username IN ('admin', 'profile', 'settings', 'dashboard', 'login', 'signup', 'auth', 'api', 'help', 'support', 'about', 'contact', 'home', 'search', 'explore', 'messages', 'notifications', 'media', 'courses', 'events', 'social', 'meet', 'membership', 'cart', 'checkout', 'invoices', 'expenses', 'finances', 'documents', 'groups', 'community') THEN
    RETURN jsonb_build_object('success', false, 'error', 'This username is reserved and cannot be used.');
  END IF;

  -- Get current username and last change timestamp
  SELECT username, last_username_change INTO v_old_username, v_last_change
  FROM profiles WHERE id = v_user_id;

  -- If same username, no-op
  IF v_old_username = v_clean_username THEN
    RETURN jsonb_build_object('success', true, 'username', v_clean_username, 'message', 'Username unchanged');
  END IF;

  -- Check cooldown (skip if never changed / first time setting)
  IF v_old_username IS NOT NULL AND v_last_change IS NOT NULL THEN
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

  -- Update the username
  UPDATE profiles 
  SET username = v_clean_username, last_username_change = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'username', v_clean_username, 
    'old_username', v_old_username,
    'message', CASE WHEN v_old_username IS NOT NULL 
      THEN 'Username changed. Old URL will redirect for 90 days.'
      ELSE 'Username set successfully.'
    END
  );
END;
$$;

-- 6. Function to resolve username (checks current + history for redirects)
CREATE OR REPLACE FUNCTION public.resolve_username(p_username TEXT)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_current_username TEXT;
BEGIN
  -- First check current username
  SELECT id, username INTO v_user_id, v_current_username
  FROM profiles WHERE username = lower(trim(p_username));

  IF v_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'found', true,
      'user_id', v_user_id,
      'username', v_current_username,
      'is_redirect', false
    );
  END IF;

  -- Check history for old usernames (most recent change first)
  SELECT h.user_id, p.username INTO v_user_id, v_current_username
  FROM username_history h
  JOIN profiles p ON p.id = h.user_id
  WHERE h.old_username = lower(trim(p_username))
  ORDER BY h.changed_at DESC
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'found', true,
      'user_id', v_user_id,
      'username', v_current_username,
      'is_redirect', true
    );
  END IF;

  RETURN jsonb_build_object('found', false);
END;
$$;
