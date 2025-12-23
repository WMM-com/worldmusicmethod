-- Add customer info and fee tracking to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS stripe_fee NUMERIC,
ADD COLUMN IF NOT EXISTS paypal_fee NUMERIC,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC,
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.subscriptions(id);

-- Add more details to subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS interval TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS coupon_code TEXT,
ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_subscription_id ON public.orders(subscription_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_email ON public.subscriptions(customer_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);