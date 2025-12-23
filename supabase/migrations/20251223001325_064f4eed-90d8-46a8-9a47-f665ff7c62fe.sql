-- Add subscription fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_price_usd numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_length_days integer DEFAULT 0;

-- Add comment for billing_interval valid values
COMMENT ON COLUMN public.products.billing_interval IS 'daily, weekly, monthly, annual - NULL for one-time purchases';

-- Create subscription_items table for linking products/courses to subscriptions
CREATE TABLE IF NOT EXISTS public.subscription_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  item_type text NOT NULL, -- 'course', 'product', 'course_group', 'product_group'
  item_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on subscription_items
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_items
CREATE POLICY "Admins can manage subscription items" 
ON public.subscription_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view subscription items" 
ON public.subscription_items 
FOR SELECT 
USING (true);

-- Create subscriptions table to track user subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  status text NOT NULL DEFAULT 'active', -- active, cancelled, expired, trialing
  payment_provider text NOT NULL, -- stripe, paypal
  provider_subscription_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  trial_end timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Admins can manage all subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create orders table for tracking sales
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  email text NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  payment_provider text NOT NULL, -- stripe, paypal
  provider_payment_id text,
  status text NOT NULL DEFAULT 'completed', -- pending, completed, refunded, failed
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for orders
CREATE POLICY "Admins can manage all orders" 
ON public.orders 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add updated_at trigger for subscriptions
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();