-- Add default currency and tax information fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'GBP',
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS vat_number text;