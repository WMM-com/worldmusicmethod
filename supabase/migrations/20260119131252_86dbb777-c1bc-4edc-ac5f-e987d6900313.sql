-- Financial Dashboard Tables for Multi-Currency Business Analytics

-- ========================================
-- 1. EXTERNAL TRANSACTIONS (PayPal & Wise)
-- ========================================

-- Store all synced transactions from PayPal and Wise
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('paypal', 'wise', 'stripe')),
  external_transaction_id TEXT NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  fee_amount NUMERIC(12,2) DEFAULT 0,
  fee_currency TEXT,
  net_amount NUMERIC(12,2),
  description TEXT,
  merchant_name TEXT,
  transaction_type TEXT, -- payment, transfer, refund, fee, conversion, withdrawal
  status TEXT DEFAULT 'completed',
  raw_data JSONB, -- Store full API response for reference
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source, external_transaction_id)
);

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage financial transactions"
ON public.financial_transactions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- 2. TRANSACTION CATEGORIZATION
-- ========================================

-- Expense categories following UK accounting standards
CREATE TYPE public.expense_category_uk AS ENUM (
  'directors_employees_subcontractor',
  'tutor_commissions',
  'legal_professional',
  'accountancy_audit',
  'consultancy',
  'property_costs',
  'rent_rates',
  'repairs_maintenance',
  'advertising_promotions',
  'bank_financial_charges',
  'travel_subsistence',
  'admin_office',
  'software_subscriptions',
  'donations',
  'income_course_sales',
  'income_membership_sales',
  'internal_transfer',
  'ignore'
);

-- Categorization for each transaction
CREATE TABLE public.transaction_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
  category public.expense_category_uk NOT NULL,
  is_auto_categorized BOOLEAN DEFAULT false,
  categorized_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  categorized_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(transaction_id)
);

ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage transaction categories"
ON public.transaction_categories
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- 3. MERCHANT CATEGORY RULES (Auto-learning)
-- ========================================

CREATE TABLE public.merchant_category_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_name TEXT NOT NULL UNIQUE,
  category public.expense_category_uk NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.merchant_category_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage merchant rules"
ON public.merchant_category_rules
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- 4. EXPENSE FORECASTING
-- ========================================

-- Expense classification for forecasting
CREATE TABLE public.expense_forecast_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category public.expense_category_uk NOT NULL UNIQUE,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'annual', 'one_time')),
  expense_type TEXT NOT NULL DEFAULT 'fixed' CHECK (expense_type IN ('fixed', 'variable', 'scalable')),
  baseline_amount NUMERIC(12,2),
  baseline_currency TEXT DEFAULT 'GBP',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_forecast_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage forecast settings"
ON public.expense_forecast_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Manual forecast overrides
CREATE TABLE public.forecast_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  forecast_month DATE NOT NULL, -- First day of the month
  category public.expense_category_uk,
  override_type TEXT NOT NULL CHECK (override_type IN ('income', 'expense')),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  is_baseline BOOLEAN DEFAULT false, -- If true, use as new baseline
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(forecast_month, category, override_type)
);

ALTER TABLE public.forecast_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage forecast overrides"
ON public.forecast_overrides
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- 5. EXCHANGE RATES
-- ========================================

CREATE TABLE public.exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_month DATE NOT NULL, -- First day of the month
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC(12,6) NOT NULL,
  source TEXT DEFAULT 'api', -- api, manual
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(rate_month, from_currency, to_currency)
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage exchange rates"
ON public.exchange_rates
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Allow public read for exchange rates
CREATE POLICY "Anyone can read exchange rates"
ON public.exchange_rates
FOR SELECT
USING (true);

-- ========================================
-- 6. SYNC STATUS TRACKING
-- ========================================

CREATE TABLE public.financial_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('paypal', 'wise', 'exchange_rates')),
  sync_type TEXT NOT NULL DEFAULT 'auto' CHECK (sync_type IN ('auto', 'manual')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  transactions_synced INTEGER DEFAULT 0,
  error_message TEXT,
  sync_details JSONB
);

ALTER TABLE public.financial_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs"
ON public.financial_sync_log
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- 7. ACCOUNT BALANCES SNAPSHOT
-- ========================================

CREATE TABLE public.account_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('paypal', 'wise')),
  currency TEXT NOT NULL,
  available_balance NUMERIC(12,2) NOT NULL,
  pending_balance NUMERIC(12,2) DEFAULT 0,
  snapshot_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source, currency, snapshot_at)
);

ALTER TABLE public.account_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage account balances"
ON public.account_balances
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- 8. FORECAST VS ACTUAL TRACKING
-- ========================================

CREATE TABLE public.forecast_actuals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month DATE NOT NULL,
  category public.expense_category_uk,
  forecast_type TEXT NOT NULL CHECK (forecast_type IN ('income', 'expense')),
  forecasted_amount NUMERIC(12,2) NOT NULL,
  actual_amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'GBP',
  variance_amount NUMERIC(12,2),
  variance_percent NUMERIC(5,2),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(month, category, forecast_type)
);

ALTER TABLE public.forecast_actuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage forecast actuals"
ON public.forecast_actuals
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- 9. TUTOR COMMISSIONS TRACKING
-- ========================================

-- Add commission_rate to product_expert_attributions if not exists
-- This tracks what percentage each tutor earns from their course sales

CREATE TABLE public.tutor_commission_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  commission_amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  commission_rate NUMERIC(5,2), -- e.g., 35, 40, 50
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT, -- PayPal transaction ID when paid
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tutor_commission_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission payments"
ON public.tutor_commission_payments
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX idx_financial_transactions_date ON public.financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_source ON public.financial_transactions(source);
CREATE INDEX idx_financial_transactions_merchant ON public.financial_transactions(merchant_name);
CREATE INDEX idx_transaction_categories_category ON public.transaction_categories(category);
CREATE INDEX idx_exchange_rates_month ON public.exchange_rates(rate_month);
CREATE INDEX idx_account_balances_snapshot ON public.account_balances(snapshot_at);
CREATE INDEX idx_tutor_commissions_status ON public.tutor_commission_payments(status);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================

CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_merchant_category_rules_updated_at
BEFORE UPDATE ON public.merchant_category_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_forecast_settings_updated_at
BEFORE UPDATE ON public.expense_forecast_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tutor_commission_payments_updated_at
BEFORE UPDATE ON public.tutor_commission_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();