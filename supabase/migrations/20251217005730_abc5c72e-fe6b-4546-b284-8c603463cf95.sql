-- Add tax_country column to profiles for storing tax residency
ALTER TABLE public.profiles 
ADD COLUMN tax_country text CHECK (tax_country IN ('UK', 'IE', 'US'));