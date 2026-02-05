-- Create payment_accounts table for storing connected payment provider accounts
CREATE TABLE public.payment_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'flutterwave', 'paypal')),
  account_id TEXT,
  account_status TEXT DEFAULT 'pending',
  onboarding_complete BOOLEAN DEFAULT false,
  account_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment accounts
CREATE POLICY "Users can view their own payment accounts"
ON public.payment_accounts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own payment accounts
CREATE POLICY "Users can insert their own payment accounts"
ON public.payment_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own payment accounts
CREATE POLICY "Users can update their own payment accounts"
ON public.payment_accounts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own payment accounts
CREATE POLICY "Users can delete their own payment accounts"
ON public.payment_accounts
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_payment_accounts_updated_at
BEFORE UPDATE ON public.payment_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();