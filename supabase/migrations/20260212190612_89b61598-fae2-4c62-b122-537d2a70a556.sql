-- Add customer_password to paypal_pending_orders for one-time payments
ALTER TABLE public.paypal_pending_orders 
ADD COLUMN IF NOT EXISTS customer_password TEXT;

-- Add customer_password to subscriptions for subscription payments
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS customer_password TEXT;