-- Create other_income table for non-event income
CREATE TABLE public.other_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'GBP',
  category TEXT NOT NULL CHECK (category IN ('royalties', 'merch', 'funding', 'benefits', 'employment', 'rental', 'teaching', 'other')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.other_income ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own other income"
ON public.other_income FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own other income"
ON public.other_income FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own other income"
ON public.other_income FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own other income"
ON public.other_income FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_other_income_updated_at
BEFORE UPDATE ON public.other_income
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add deductibility columns to expenses
ALTER TABLE public.expenses
ADD COLUMN is_tax_deductible BOOLEAN DEFAULT true,
ADD COLUMN deductible_percentage INTEGER DEFAULT 100 CHECK (deductible_percentage >= 0 AND deductible_percentage <= 100);