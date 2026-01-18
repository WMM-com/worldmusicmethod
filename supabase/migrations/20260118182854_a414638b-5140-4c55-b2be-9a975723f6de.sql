-- Artist Dashboard Access: Link users to artists for dashboard access
-- Multiple users can have access to the same artist

CREATE TABLE public.artist_dashboard_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.media_artists(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, artist_id)
);

-- Revenue Pool Configuration: Store monthly revenue pool settings
CREATE TABLE public.revenue_pool_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  pool_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(year, month)
);

-- Enable RLS
ALTER TABLE public.artist_dashboard_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_pool_settings ENABLE ROW LEVEL SECURITY;

-- Artist dashboard access: Users can see their own access, admins can manage all
CREATE POLICY "Users can view their own artist access"
  ON public.artist_dashboard_access
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage artist access"
  ON public.artist_dashboard_access
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Revenue pool settings: Only admins can read/manage
CREATE POLICY "Admins can manage revenue pool settings"
  ON public.revenue_pool_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Users with artist dashboard access can view revenue pool for their calculations
CREATE POLICY "Artists can view revenue pool settings"
  ON public.revenue_pool_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.artist_dashboard_access
      WHERE user_id = auth.uid()
    )
  );

-- Function to check if user has artist dashboard access
CREATE OR REPLACE FUNCTION public.has_artist_dashboard_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.artist_dashboard_access
    WHERE user_id = p_user_id
  )
$$;

-- Function to get artist IDs a user has access to
CREATE OR REPLACE FUNCTION public.get_user_artist_ids(p_user_id UUID)
RETURNS TABLE(artist_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ada.artist_id
  FROM public.artist_dashboard_access ada
  WHERE ada.user_id = p_user_id
$$;

-- Index for faster lookups
CREATE INDEX idx_artist_dashboard_access_user ON public.artist_dashboard_access(user_id);
CREATE INDEX idx_artist_dashboard_access_artist ON public.artist_dashboard_access(artist_id);
CREATE INDEX idx_revenue_pool_year_month ON public.revenue_pool_settings(year, month);