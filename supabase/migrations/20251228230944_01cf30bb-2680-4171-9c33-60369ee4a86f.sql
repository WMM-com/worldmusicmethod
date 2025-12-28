-- Add invoice message templates to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invoice_late_payment_messages jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS invoice_thank_you_messages jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auto_add_late_payment_message boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_add_thank_you_message boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS default_late_payment_message_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS default_thank_you_message_id text DEFAULT NULL;