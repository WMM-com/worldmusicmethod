-- Create table for income proof shares
CREATE TABLE public.income_proof_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  share_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  include_income_summary boolean DEFAULT true,
  include_monthly_breakdown boolean DEFAULT true,
  include_tax_calculations boolean DEFAULT false,
  include_other_income boolean DEFAULT true,
  valid_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.income_proof_shares ENABLE ROW LEVEL SECURITY;

-- Users can manage their own shares
CREATE POLICY "Users can view own shares"
ON public.income_proof_shares FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shares"
ON public.income_proof_shares FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shares"
ON public.income_proof_shares FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shares"
ON public.income_proof_shares FOR DELETE
USING (auth.uid() = user_id);

-- Public can view via valid token (for the shared page)
CREATE POLICY "Public can view via valid token"
ON public.income_proof_shares FOR SELECT
USING (
  share_token IS NOT NULL 
  AND (valid_until IS NULL OR valid_until > now())
);

-- Create function to get income proof data by token
CREATE OR REPLACE FUNCTION public.get_income_proof_by_token(p_token uuid)
RETURNS TABLE (
  share_id uuid,
  include_income_summary boolean,
  include_monthly_breakdown boolean,
  include_tax_calculations boolean,
  include_other_income boolean,
  owner_user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    include_income_summary,
    include_monthly_breakdown,
    include_tax_calculations,
    include_other_income,
    user_id
  FROM public.income_proof_shares
  WHERE share_token = p_token
    AND (valid_until IS NULL OR valid_until > now());
$$;

-- Create function to get user's financial summary for sharing
CREATE OR REPLACE FUNCTION public.get_shared_financial_data(p_user_id uuid)
RETURNS TABLE (
  business_name text,
  full_name text,
  total_event_income numeric,
  total_other_income numeric,
  monthly_data jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH event_income AS (
    SELECT COALESCE(SUM(fee), 0) as total
    FROM public.events
    WHERE user_id = p_user_id
      AND status = 'completed'
      AND deleted_at IS NULL
  ),
  other_income AS (
    SELECT COALESCE(SUM(amount), 0) as total
    FROM public.other_income
    WHERE user_id = p_user_id
  ),
  monthly AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'month', to_char(month_start, 'Mon YYYY'),
        'event_income', event_total,
        'other_income', other_total
      ) ORDER BY month_start DESC
    ) as data
    FROM (
      SELECT 
        date_trunc('month', e.start_time) as month_start,
        COALESCE(SUM(e.fee), 0) as event_total,
        0 as other_total
      FROM public.events e
      WHERE e.user_id = p_user_id
        AND e.status = 'completed'
        AND e.deleted_at IS NULL
        AND e.start_time >= now() - interval '12 months'
      GROUP BY date_trunc('month', e.start_time)
    ) months
  ),
  profile AS (
    SELECT business_name, full_name
    FROM public.profiles
    WHERE id = p_user_id
  )
  SELECT 
    p.business_name,
    p.full_name,
    ei.total,
    oi.total,
    COALESCE(m.data, '[]'::jsonb)
  FROM profile p, event_income ei, other_income oi, monthly m;
$$;