-- Add refund tracking to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS refund_reason text,
ADD COLUMN IF NOT EXISTS provider_refund_id text;

-- Add pending cancellation fields to subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS cancels_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS current_period_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS product_name text;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_orders_refunded ON public.orders(refunded_at) WHERE refunded_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_cancels_at ON public.subscriptions(cancels_at) WHERE cancels_at IS NOT NULL;