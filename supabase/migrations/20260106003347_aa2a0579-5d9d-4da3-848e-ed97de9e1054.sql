-- Make user_id nullable on subscriptions table to support PayPal flow where user is created after subscription
ALTER TABLE public.subscriptions ALTER COLUMN user_id DROP NOT NULL;