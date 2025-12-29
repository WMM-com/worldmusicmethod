-- Delete Income Proof Sharing feature entirely

-- Drop the RPC functions first
DROP FUNCTION IF EXISTS public.get_income_proof_by_token(uuid);
DROP FUNCTION IF EXISTS public.get_shared_financial_data(uuid);

-- Drop the table (this will cascade delete all data)
DROP TABLE IF EXISTS public.income_proof_shares;