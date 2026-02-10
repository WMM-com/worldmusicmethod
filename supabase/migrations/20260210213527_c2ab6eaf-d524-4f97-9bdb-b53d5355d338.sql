
-- Table to track subscription status for connected accounts (written by webhooks, read by frontend)
CREATE TABLE public.connected_account_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connected_account_id TEXT NOT NULL, -- Stripe connected account ID (acct_...)
  subscription_id TEXT NOT NULL UNIQUE, -- Stripe subscription ID (sub_...)
  status TEXT NOT NULL DEFAULT 'active', -- active, canceled, past_due, etc.
  price_id TEXT, -- Stripe price ID
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.connected_account_subscriptions ENABLE ROW LEVEL SECURITY;

-- Webhooks write via service_role (bypasses RLS)
-- Users can view subscriptions for their own connected accounts
CREATE POLICY "Users can view their connected account subscriptions"
ON public.connected_account_subscriptions
FOR SELECT
TO authenticated
USING (
  connected_account_id IN (
    SELECT account_id FROM public.payment_accounts 
    WHERE user_id = auth.uid() AND provider = 'stripe'
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_connected_account_subscriptions_updated_at
BEFORE UPDATE ON public.connected_account_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
