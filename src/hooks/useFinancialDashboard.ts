import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CurrencyView = 'native' | 'gbp';

export interface FinancialSummary {
  grossRevenue: { GBP: number; USD: number; EUR: number };
  netRevenue: { GBP: number; USD: number; EUR: number };
  fees: { paypal: number; stripe: number; conversion: number; total: number };
  expenses: { total: number; byCategory: Record<string, number> };
  profitLoss: number;
  accountBalances: {
    paypal: { GBP: number; USD: number; EUR: number };
    wise: { GBP: number; USD: number; EUR: number };
  };
  membershipMetrics: {
    activeMonthly: number;
    activeAnnual: number;
    newThisMonth: number;
    cancelledThisMonth: number;
    mrr: number;
    trialConversionRate: number;
    trialsStarted: number;
    trialsConverted: number;
  };
  period: { start: string; end: string };
}

export interface Transaction {
  id: string;
  external_transaction_id: string;
  source: string;
  transaction_date: string;
  amount: number;
  currency: string;
  description: string | null;
  merchant_name: string | null;
  transaction_type: string | null;
  fee_amount: number | null;
  status: string | null;
}

export interface SyncStatus {
  lastSync: string | null;
  isLoading: boolean;
}

const EXPENSE_CATEGORIES = [
  'directors_employees_subcontractor',
  'legal_professional',
  'property_costs',
  'advertising_promotions',
  'bank_financial_charges',
  'donations',
  'travel_subsistence',
  'admin_office',
  'software_subscriptions',
  'ignore',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  directors_employees_subcontractor: 'Directors, Employees & Subcontractors',
  legal_professional: 'Legal & Professional',
  property_costs: 'Property Costs',
  advertising_promotions: 'Advertising & Promotions',
  bank_financial_charges: 'Bank & Financial Charges',
  donations: 'Donations',
  travel_subsistence: 'Travel & Subsistence',
  admin_office: 'Admin & Office',
  software_subscriptions: 'Software & Subscriptions',
  ignore: 'Ignore / Do Not Count',
};

export function useFinancialDashboard() {
  const queryClient = useQueryClient();
  const [currencyView, setCurrencyView] = useState<CurrencyView>('native');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(),
  });

  // Fetch financial summary
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['financial-summary', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-financial-summary', {
        body: {
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
        },
      });
      if (error) throw error;
      return data as FinancialSummary;
    },
  });

  // Fetch transactions
  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['financial-transactions', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .gte('transaction_date', dateRange.start.toISOString())
        .lte('transaction_date', dateRange.end.toISOString())
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Transaction[];
    },
  });

  // Fetch sync status
  const { data: syncLogs } = useQuery({
    queryKey: ['financial-sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_sync_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Sync PayPal
  const syncPayPal = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-paypal-transactions');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`PayPal sync complete: ${data.transactionsSynced || 0} transactions`);
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['financial-sync-logs'] });
    },
    onError: (error: Error) => {
      toast.error(`PayPal sync failed: ${error.message}`);
    },
  });

  // Sync Wise
  const syncWise = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-wise-transactions');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Wise sync complete: ${data.transactionsSynced || 0} transactions`);
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['financial-sync-logs'] });
    },
    onError: (error: Error) => {
      toast.error(`Wise sync failed: ${error.message}`);
    },
  });

  // Sync exchange rates
  const syncExchangeRates = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-exchange-rates');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Exchange rates updated');
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
    onError: (error: Error) => {
      toast.error(`Exchange rate sync failed: ${error.message}`);
    },
  });

  // Categorize transaction
  const categorizeTransaction = useMutation({
    mutationFn: async ({ transactionId, category }: { transactionId: string; category: string | null }) => {
      const { error } = await supabase
        .from('financial_transactions')
        .update({ 
          transaction_type: category,
        })
        .eq('id', transactionId);
      if (error) throw error;

      // If categorizing, also save the merchant rule
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction?.merchant_name && category) {
        const { error: ruleError } = await supabase
          .from('merchant_category_rules')
          .upsert({
            merchant_name: transaction.merchant_name,
            category: category as any,
          }, { onConflict: 'merchant_name' });
        if (ruleError) console.error('Failed to save merchant rule:', ruleError);
      }
    },
    onSuccess: () => {
      toast.success('Transaction categorized');
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to categorize: ${error.message}`);
    },
  });

  // Apply auto-categorization
  const applyAutoCategorization = useMutation({
    mutationFn: async () => {
      // Get all merchant rules
      const { data: rules, error: rulesError } = await supabase
        .from('merchant_category_rules')
        .select('*');
      if (rulesError) throw rulesError;

      if (!rules?.length) {
        throw new Error('No categorization rules found');
      }

      // Apply each rule
      let updated = 0;
      for (const rule of rules) {
        const { count, error } = await supabase
          .from('financial_transactions')
          .update({ 
            transaction_type: rule.category,
          })
          .eq('merchant_name', rule.merchant_name)
          .is('transaction_type', null);
        if (!error && count) updated += count;
      }
      return { updated };
    },
    onSuccess: (data) => {
      toast.success(`Auto-categorized ${data.updated} transactions`);
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
    onError: (error: Error) => {
      toast.error(`Auto-categorization failed: ${error.message}`);
    },
  });

  // Generate forecast
  const { data: forecast, isLoading: forecastLoading, refetch: refetchForecast } = useQuery({
    queryKey: ['financial-forecast'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-forecast', {
        body: { months: 12 },
      });
      if (error) throw error;
      return data;
    },
  });

  // Sync all
  const syncAll = useCallback(async () => {
    await Promise.all([
      syncPayPal.mutateAsync(),
      syncWise.mutateAsync(),
      syncExchangeRates.mutateAsync(),
    ]);
  }, []);

  return {
    // Data
    summary,
    transactions,
    forecast,
    syncLogs,
    
    // Loading states
    summaryLoading,
    transactionsLoading,
    forecastLoading,
    isSyncing: syncPayPal.isPending || syncWise.isPending || syncExchangeRates.isPending,
    
    // View state
    currencyView,
    setCurrencyView,
    dateRange,
    setDateRange,
    
    // Actions
    syncPayPal: syncPayPal.mutate,
    syncWise: syncWise.mutate,
    syncExchangeRates: syncExchangeRates.mutate,
    syncAll,
    categorizeTransaction: categorizeTransaction.mutate,
    applyAutoCategorization: applyAutoCategorization.mutate,
    refetchSummary,
    refetchTransactions,
    refetchForecast,
    
    // Constants
    EXPENSE_CATEGORIES,
    CATEGORY_LABELS,
  };
}
