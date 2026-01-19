import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FinancialSummary {
  grossRevenue: { GBP: number; USD: number; EUR: number };
  fees: {
    stripe: { GBP: number; USD: number; EUR: number };
    paypal: { GBP: number; USD: number; EUR: number };
    conversion: { GBP: number; USD: number; EUR: number };
    total: { GBP: number; USD: number; EUR: number };
  };
  netRevenue: { GBP: number; USD: number; EUR: number };
  expenses: { GBP: number; USD: number; EUR: number };
  profitLoss: { GBP: number; USD: number; EUR: number };
  revenueBySource: {
    stripe: { GBP: number; USD: number; EUR: number };
    paypal: { GBP: number; USD: number; EUR: number };
  };
  revenueByProduct: {
    courses: { GBP: number; USD: number; EUR: number };
    memberships: { GBP: number; USD: number; EUR: number };
  };
  balances: {
    paypal: { GBP: number; USD: number; EUR: number };
    wise: { GBP: number; USD: number; EUR: number };
  };
  expensesByCategory: Record<string, { GBP: number; USD: number; EUR: number }>;
  membershipMetrics: {
    activeMonthly: number;
    activeAnnual: number;
    newThisMonth: number;
    cancelledThisMonth: number;
    mrr: { GBP: number; USD: number; EUR: number };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: isAdmin } = await supabase.rpc('has_role', { 
          _user_id: user.id, 
          _role: 'admin' 
        });
        
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const body = await req.json().catch(() => ({}));
    const startDate = body.startDate || body.start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const endDate = body.endDate || body.end_date || new Date().toISOString();

    console.log(`Getting financial summary from ${startDate} to ${endDate}`);

    const initCurrency = () => ({ GBP: 0, USD: 0, EUR: 0 });

    // Get orders from site database
    const { data: orders } = await supabase
      .from('orders')
      .select('*, products(name, product_type)')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('status', 'completed');

    // Calculate revenue from orders
    const grossRevenue = initCurrency();
    const stripeFees = initCurrency();
    const paypalFees = initCurrency();
    const revenueBySource = {
      stripe: initCurrency(),
      paypal: initCurrency(),
    };
    const revenueByProduct = {
      courses: initCurrency(),
      memberships: initCurrency(),
    };

    for (const order of orders || []) {
      const currency = (order.currency || 'USD').toUpperCase() as 'GBP' | 'USD' | 'EUR';
      if (!(currency in grossRevenue)) continue;

      const amount = order.amount || 0;
      grossRevenue[currency] += amount;

      // Track fees
      if (order.stripe_fee) {
        stripeFees[currency] += order.stripe_fee;
        revenueBySource.stripe[currency] += amount;
      }
      if (order.paypal_fee) {
        paypalFees[currency] += order.paypal_fee;
        revenueBySource.paypal[currency] += amount;
      }

      // Track by product type
      const productType = order.products?.product_type;
      if (productType === 'membership' || productType === 'subscription') {
        revenueByProduct.memberships[currency] += amount;
      } else {
        revenueByProduct.courses[currency] += amount;
      }
    }

    // Get categorized expenses from financial_transactions
    const { data: transactions } = await supabase
      .from('financial_transactions')
      .select('*, transaction_categories(*)')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    const expenses = initCurrency();
    const conversionFees = initCurrency();
    const expensesByCategory: Record<string, { GBP: number; USD: number; EUR: number }> = {};

    for (const tx of transactions || []) {
      const currency = (tx.currency || 'USD').toUpperCase() as 'GBP' | 'USD' | 'EUR';
      if (!(currency in expenses)) continue;

      const category = tx.transaction_categories?.[0]?.category;
      
      // Track conversion fees
      if (category === 'bank_financial_charges' && tx.transaction_type === 'conversion') {
        conversionFees[currency] += Math.abs(tx.fee_amount || 0);
      }

      // Track expenses (negative amounts or expense categories)
      if (tx.amount < 0 && category && category !== 'ignore' && category !== 'internal_transfer' && 
          !category.startsWith('income_')) {
        const expenseAmount = Math.abs(tx.amount);
        expenses[currency] += expenseAmount;

        if (!expensesByCategory[category]) {
          expensesByCategory[category] = initCurrency();
        }
        expensesByCategory[category][currency] += expenseAmount;
      }
    }

    // Calculate totals
    const totalFees = {
      GBP: stripeFees.GBP + paypalFees.GBP + conversionFees.GBP,
      USD: stripeFees.USD + paypalFees.USD + conversionFees.USD,
      EUR: stripeFees.EUR + paypalFees.EUR + conversionFees.EUR,
    };

    const netRevenue = {
      GBP: grossRevenue.GBP - totalFees.GBP,
      USD: grossRevenue.USD - totalFees.USD,
      EUR: grossRevenue.EUR - totalFees.EUR,
    };

    const profitLoss = {
      GBP: netRevenue.GBP - expenses.GBP,
      USD: netRevenue.USD - expenses.USD,
      EUR: netRevenue.EUR - expenses.EUR,
    };

    // Get latest account balances
    const { data: latestBalances } = await supabase
      .from('account_balances')
      .select('*')
      .order('snapshot_at', { ascending: false })
      .limit(10);

    const balances = {
      paypal: initCurrency(),
      wise: initCurrency(),
    };

    const seenBalances = new Set<string>();
    for (const bal of latestBalances || []) {
      const key = `${bal.source}-${bal.currency}`;
      if (seenBalances.has(key)) continue;
      seenBalances.add(key);

      const currency = bal.currency as 'GBP' | 'USD' | 'EUR';
      if (bal.source === 'paypal' && currency in balances.paypal) {
        balances.paypal[currency] = bal.available_balance;
      } else if (bal.source === 'wise' && currency in balances.wise) {
        balances.wise[currency] = bal.available_balance;
      }
    }

    // Get membership metrics
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active');

    const { data: newSubs } = await supabase
      .from('subscriptions')
      .select('*')
      .gte('created_at', monthStart)
      .eq('status', 'active');

    const { data: cancelledSubs } = await supabase
      .from('subscriptions')
      .select('*')
      .gte('updated_at', monthStart)
      .eq('status', 'cancelled');

    const mrr = initCurrency();
    let activeMonthly = 0;
    let activeAnnual = 0;

    for (const sub of subscriptions || []) {
      const currency = (sub.currency || 'USD').toUpperCase() as 'GBP' | 'USD' | 'EUR';
      const amount = sub.amount || 0;

      if (sub.plan_type === 'monthly') {
        activeMonthly++;
        if (currency in mrr) mrr[currency] += amount;
      } else if (sub.plan_type === 'annual') {
        activeAnnual++;
        if (currency in mrr) mrr[currency] += amount / 12;
      }
    }

    // Convert to simplified format expected by frontend
    const totalExpenses = expenses.GBP + expenses.USD + expenses.EUR;
    const expensesByCategoryFlat: Record<string, number> = {};
    for (const [cat, vals] of Object.entries(expensesByCategory)) {
      expensesByCategoryFlat[cat] = vals.GBP + vals.USD + vals.EUR;
    }

    const summary = {
      grossRevenue,
      netRevenue,
      fees: {
        paypal: paypalFees.GBP + paypalFees.USD + paypalFees.EUR,
        stripe: stripeFees.GBP + stripeFees.USD + stripeFees.EUR,
        conversion: conversionFees.GBP + conversionFees.USD + conversionFees.EUR,
        total: totalFees.GBP + totalFees.USD + totalFees.EUR,
      },
      expenses: {
        total: totalExpenses,
        byCategory: expensesByCategoryFlat,
      },
      profitLoss: profitLoss.GBP + profitLoss.USD + profitLoss.EUR,
      accountBalances: {
        paypal: balances.paypal,
        wise: balances.wise,
      },
      membershipMetrics: {
        activeMonthly,
        activeAnnual,
        newThisMonth: newSubs?.length || 0,
        cancelledThisMonth: cancelledSubs?.length || 0,
        mrr: mrr.GBP + mrr.USD + mrr.EUR,
        trialConversionRate: 0, // TODO: Calculate from trial data
        trialsStarted: 0,
        trialsConverted: 0,
      },
      period: { start: startDate, end: endDate },
    };

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Financial summary error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
