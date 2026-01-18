
-- Play events table for individual play tracking
CREATE TABLE public.play_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('song', 'podcast_episode')),
  listen_duration_seconds INTEGER NOT NULL DEFAULT 0,
  content_duration_seconds INTEGER NOT NULL,
  play_credits NUMERIC(3,1) NOT NULL DEFAULT 0,
  threshold_met BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for cooldown checks (user + content + recent time)
CREATE INDEX idx_play_events_cooldown ON public.play_events(user_id, content_id, created_at DESC);
CREATE INDEX idx_play_events_content ON public.play_events(content_id, created_at);
CREATE INDEX idx_play_events_user ON public.play_events(user_id, created_at);

-- Monthly artist credits aggregation table
CREATE TABLE public.monthly_artist_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.media_artists(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  total_play_credits NUMERIC(10,1) NOT NULL DEFAULT 0,
  song_plays INTEGER NOT NULL DEFAULT 0,
  podcast_plays INTEGER NOT NULL DEFAULT 0,
  unique_listeners INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(artist_id, year, month)
);

CREATE INDEX idx_monthly_artist_credits_lookup ON public.monthly_artist_credits(artist_id, year, month);

-- Enable RLS
ALTER TABLE public.play_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_artist_credits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for play_events
CREATE POLICY "Users can view their own play events"
  ON public.play_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own play events"
  ON public.play_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for monthly_artist_credits (public read for transparency)
CREATE POLICY "Anyone can view monthly artist credits"
  ON public.monthly_artist_credits FOR SELECT
  USING (true);

-- Admin can manage monthly credits
CREATE POLICY "Admins can manage monthly artist credits"
  ON public.monthly_artist_credits FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to check cooldown and register play
CREATE OR REPLACE FUNCTION public.register_play_event(
  p_content_id UUID,
  p_content_type TEXT,
  p_listen_duration_seconds INTEGER,
  p_content_duration_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_threshold_percent NUMERIC;
  v_threshold_met BOOLEAN;
  v_play_credits NUMERIC(3,1);
  v_last_credited_play TIMESTAMP WITH TIME ZONE;
  v_cooldown_passed BOOLEAN;
  v_artist_id UUID;
  v_current_year INTEGER;
  v_current_month INTEGER;
  v_play_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Calculate threshold percentage
  IF p_content_duration_seconds > 0 THEN
    v_threshold_percent := (p_listen_duration_seconds::NUMERIC / p_content_duration_seconds::NUMERIC) * 100;
  ELSE
    v_threshold_percent := 0;
  END IF;
  
  -- Check if 50% threshold met
  v_threshold_met := v_threshold_percent >= 50;
  
  -- Determine play credits based on content type
  IF p_content_type = 'song' THEN
    v_play_credits := 1.0;
  ELSIF p_content_type = 'podcast_episode' THEN
    v_play_credits := 0.5;
  ELSE
    v_play_credits := 0;
  END IF;
  
  -- Check cooldown (1 hour since last credited play for same content)
  SELECT created_at INTO v_last_credited_play
  FROM public.play_events
  WHERE user_id = v_user_id
    AND content_id = p_content_id
    AND threshold_met = true
    AND play_credits > 0
  ORDER BY created_at DESC
  LIMIT 1;
  
  v_cooldown_passed := v_last_credited_play IS NULL 
    OR (now() - v_last_credited_play) > INTERVAL '1 hour';
  
  -- If threshold not met or cooldown not passed, record with 0 credits
  IF NOT v_threshold_met OR NOT v_cooldown_passed THEN
    INSERT INTO public.play_events (
      user_id, content_id, content_type, 
      listen_duration_seconds, content_duration_seconds,
      play_credits, threshold_met
    ) VALUES (
      v_user_id, p_content_id, p_content_type,
      p_listen_duration_seconds, p_content_duration_seconds,
      0, v_threshold_met
    )
    RETURNING id INTO v_play_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'play_id', v_play_id,
      'credits_earned', 0,
      'threshold_met', v_threshold_met,
      'cooldown_passed', v_cooldown_passed,
      'listen_percent', v_threshold_percent
    );
  END IF;
  
  -- Threshold met and cooldown passed - award credits
  INSERT INTO public.play_events (
    user_id, content_id, content_type,
    listen_duration_seconds, content_duration_seconds,
    play_credits, threshold_met
  ) VALUES (
    v_user_id, p_content_id, p_content_type,
    p_listen_duration_seconds, p_content_duration_seconds,
    v_play_credits, true
  )
  RETURNING id INTO v_play_id;
  
  -- Get artist ID from the track
  SELECT artist_id INTO v_artist_id
  FROM public.media_tracks
  WHERE id = p_content_id;
  
  -- Update monthly artist credits if we found an artist
  IF v_artist_id IS NOT NULL THEN
    v_current_year := EXTRACT(YEAR FROM now())::INTEGER;
    v_current_month := EXTRACT(MONTH FROM now())::INTEGER;
    
    INSERT INTO public.monthly_artist_credits (
      artist_id, year, month, total_play_credits,
      song_plays, podcast_plays, unique_listeners
    ) VALUES (
      v_artist_id, v_current_year, v_current_month, v_play_credits,
      CASE WHEN p_content_type = 'song' THEN 1 ELSE 0 END,
      CASE WHEN p_content_type = 'podcast_episode' THEN 1 ELSE 0 END,
      1
    )
    ON CONFLICT (artist_id, year, month) DO UPDATE SET
      total_play_credits = monthly_artist_credits.total_play_credits + v_play_credits,
      song_plays = monthly_artist_credits.song_plays + CASE WHEN p_content_type = 'song' THEN 1 ELSE 0 END,
      podcast_plays = monthly_artist_credits.podcast_plays + CASE WHEN p_content_type = 'podcast_episode' THEN 1 ELSE 0 END,
      unique_listeners = (
        SELECT COUNT(DISTINCT pe.user_id)
        FROM public.play_events pe
        JOIN public.media_tracks mt ON mt.id = pe.content_id
        WHERE mt.artist_id = v_artist_id
          AND pe.threshold_met = true
          AND pe.play_credits > 0
          AND EXTRACT(YEAR FROM pe.created_at) = v_current_year
          AND EXTRACT(MONTH FROM pe.created_at) = v_current_month
      ),
      updated_at = now();
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'play_id', v_play_id,
    'credits_earned', v_play_credits,
    'threshold_met', true,
    'cooldown_passed', true,
    'listen_percent', v_threshold_percent
  );
END;
$$;
