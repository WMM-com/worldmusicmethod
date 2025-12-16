-- Drop the overly permissive public contract policy
DROP POLICY IF EXISTS "Public can view shared contracts" ON public.contracts;

-- Create a secure function to get public contract data with restricted columns
CREATE OR REPLACE FUNCTION public.get_shared_contract(p_share_token UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  client_name TEXT,
  created_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.title,
    c.client_name,
    c.created_at,
    c.signed_at
  FROM public.contracts c
  WHERE c.share_token = p_share_token
    AND c.share_token IS NOT NULL;
$$;