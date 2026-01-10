-- Add column to track pending PayPal subscription during switch
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS pending_paypal_subscription_id TEXT;