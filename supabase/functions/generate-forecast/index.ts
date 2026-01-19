import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonthlyForecast {
  month: string;
  income: { GBP: number; USD: number; EUR: number };
  expenses: { GBP: number; USD: number; EUR: number };
  profitLoss: { GBP: number; USD: number; EUR: number };
  breakdown: {
    courseRevenue: { GBP: number; USD: number; EUR: number };
    membershipRevenue: { GBP: number; USD: number; EUR: number };
    expensesByCategory: Record<string, { GBP: number; USD: number; EUR: number }>;
  };
  isActual?: boolean;
  hasOverride?: boolean;
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
    const months = body.months || 12; // Default 12-month forecast

    console.log(`Generating ${months}-month forecast`);

    const initCurrency = () => ({ GBP: 0, USD: 0, EUR: 0 });
    const now = new Date();

    // Get historical data for the last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    
    // Get historical orders
    const { data: historicalOrders } = await supabase
      .from('orders')
      .select('*, products(name, product_type)')
      .gte('created_at', sixMonthsAgo.toISOString())
      .eq('status', 'completed');

    // Get historical categorized expenses
    const { data: historicalTransactions } = await supabase
      .from('financial_transactions')
      .select('*, transaction_categories(*)')
      .gte('transaction_date', sixMonthsAgo.toISOString());

    // Get forecast settings
    const { data: forecastSettings } = await supabase
      .from('expense_forecast_settings')
      .select('*');

    // Get manual overrides
    const { data: overrides } = await supabase
      .from('forecast_overrides')
      .select('*');

    const overrideMap = new Map<string, any>();
    for (const o of overrides || []) {
      const key = `${o.forecast_month}-${o.category}-${o.override_type}`;
      overrideMap.set(key, o);
    }

    // Calculate monthly averages from historical data
    const monthlyData: Map<string, {
      courseRevenue: { GBP: number; USD: number; EUR: number };
      membershipRevenue: { GBP: number; USD: number; EUR: number };
      expensesByCategory: Record<string, { GBP: number; USD: number; EUR: number }>;
    }> = new Map();

    // Process historical orders
    for (const order of historicalOrders || []) {
      const date = new Date(order.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          courseRevenue: initCurrency(),
          membershipRevenue: initCurrency(),
          expensesByCategory: {},
        });
      }

      const data = monthlyData.get(monthKey)!;
      const currency = (order.currency || 'USD').toUpperCase() as 'GBP' | 'USD' | 'EUR';
      if (!(currency in data.courseRevenue)) continue;

      const amount = order.amount || 0;
      const productType = order.products?.product_type;

      if (productType === 'membership' || productType === 'subscription') {
        data.membershipRevenue[currency] += amount;
      } else {
        data.courseRevenue[currency] += amount;
      }
    }

    // Process historical expenses
    for (const tx of historicalTransactions || []) {
      if (tx.amount >= 0) continue; // Only expenses (negative amounts)
      
      const category = tx.transaction_categories?.[0]?.category;
      if (!category || category === 'ignore' || category === 'internal_transfer') continue;

      const date = new Date(tx.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          courseRevenue: initCurrency(),
          membershipRevenue: initCurrency(),
          expensesByCategory: {},
        });
      }

      const data = monthlyData.get(monthKey)!;
      const currency = (tx.currency || 'USD').toUpperCase() as 'GBP' | 'USD' | 'EUR';

      if (!data.expensesByCategory[category]) {
        data.expensesByCategory[category] = initCurrency();
      }
      if (currency in data.expensesByCategory[category]) {
        data.expensesByCategory[category][currency] += Math.abs(tx.amount);
      }
    }

    // Calculate averages from last 3 months
    const last3Months: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last3Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const avgCourseRevenue = initCurrency();
    const avgMembershipRevenue = initCurrency();
    const avgExpensesByCategory: Record<string, { GBP: number; USD: number; EUR: number }> = {};
    let monthsWithData = 0;

    for (const monthKey of last3Months) {
      const data = monthlyData.get(monthKey);
      if (!data) continue;
      monthsWithData++;

      for (const cur of ['GBP', 'USD', 'EUR'] as const) {
        avgCourseRevenue[cur] += data.courseRevenue[cur];
        avgMembershipRevenue[cur] += data.membershipRevenue[cur];
      }

      for (const [cat, amounts] of Object.entries(data.expensesByCategory)) {
        if (!avgExpensesByCategory[cat]) {
          avgExpensesByCategory[cat] = initCurrency();
        }
        for (const cur of ['GBP', 'USD', 'EUR'] as const) {
          avgExpensesByCategory[cat][cur] += amounts[cur];
        }
      }
    }

    // Average the values
    if (monthsWithData > 0) {
      for (const cur of ['GBP', 'USD', 'EUR'] as const) {
        avgCourseRevenue[cur] /= monthsWithData;
        avgMembershipRevenue[cur] /= monthsWithData;
      }
      for (const amounts of Object.values(avgExpensesByCategory)) {
        for (const cur of ['GBP', 'USD', 'EUR'] as const) {
          amounts[cur] /= monthsWithData;
        }
      }
    }

    // Get current active subscriptions for MRR baseline
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active');

    const mrrBaseline = initCurrency();
    for (const sub of subscriptions || []) {
      const currency = (sub.currency || 'USD').toUpperCase() as 'GBP' | 'USD' | 'EUR';
      const amount = sub.amount || 0;
      
      if (currency in mrrBaseline) {
        if (sub.plan_type === 'monthly') {
          mrrBaseline[currency] += amount;
        } else if (sub.plan_type === 'annual') {
          mrrBaseline[currency] += amount / 12;
        }
      }
    }

    // Generate forecasts
    const forecasts: MonthlyForecast[] = [];

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthStr = forecastDate.toISOString().split('T')[0];
      const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;

      // Check if we have actual data for this month
      const actualData = monthlyData.get(monthKey);
      const isActual = i === 0 && actualData; // Current month might have partial actuals

      // Calculate projected income
      let courseRevenue = { ...avgCourseRevenue };
      let membershipRevenue = { ...mrrBaseline }; // Use MRR as baseline

      // Check for income overrides
      const incomeOverrideKey = `${monthStr}-null-income`;
      if (overrideMap.has(incomeOverrideKey)) {
        const override = overrideMap.get(incomeOverrideKey)!;
        const currency = (override.currency || 'GBP').toUpperCase() as 'GBP' | 'USD' | 'EUR';
        courseRevenue[currency] = override.amount;
      }

      // Calculate projected expenses by category
      const projectedExpenses: Record<string, { GBP: number; USD: number; EUR: number }> = {};
      let totalExpenses = initCurrency();

      for (const setting of forecastSettings || []) {
        const category = setting.category;
        let amount = initCurrency();

        // Check for override first
        const expenseOverrideKey = `${monthStr}-${category}-expense`;
        if (overrideMap.has(expenseOverrideKey)) {
          const override = overrideMap.get(expenseOverrideKey)!;
          const currency = (override.currency || 'GBP').toUpperCase() as 'GBP' | 'USD' | 'EUR';
          amount[currency] = override.amount;
        } else if (setting.baseline_amount) {
          // Use baseline from settings
          const currency = (setting.baseline_currency || 'GBP').toUpperCase() as 'GBP' | 'USD' | 'EUR';
          
          if (setting.frequency === 'monthly') {
            amount[currency] = setting.baseline_amount;
          } else if (setting.frequency === 'annual') {
            amount[currency] = setting.baseline_amount / 12;
          }
        } else if (avgExpensesByCategory[category]) {
          // Use historical average
          amount = { ...avgExpensesByCategory[category] };
        }

        if (Object.values(amount).some(v => v > 0)) {
          projectedExpenses[category] = amount;
          for (const cur of ['GBP', 'USD', 'EUR'] as const) {
            totalExpenses[cur] += amount[cur];
          }
        }
      }

      // Add any categories from history not in settings
      for (const [cat, amounts] of Object.entries(avgExpensesByCategory)) {
        if (!projectedExpenses[cat]) {
          projectedExpenses[cat] = { ...amounts };
          for (const cur of ['GBP', 'USD', 'EUR'] as const) {
            totalExpenses[cur] += amounts[cur];
          }
        }
      }

      const totalIncome = {
        GBP: courseRevenue.GBP + membershipRevenue.GBP,
        USD: courseRevenue.USD + membershipRevenue.USD,
        EUR: courseRevenue.EUR + membershipRevenue.EUR,
      };

      forecasts.push({
        month: monthStr,
        income: totalIncome,
        expenses: totalExpenses,
        profitLoss: {
          GBP: totalIncome.GBP - totalExpenses.GBP,
          USD: totalIncome.USD - totalExpenses.USD,
          EUR: totalIncome.EUR - totalExpenses.EUR,
        },
        breakdown: {
          courseRevenue,
          membershipRevenue,
          expensesByCategory: projectedExpenses,
        },
        isActual: !!isActual,
        hasOverride: Array.from(overrideMap.keys()).some(k => k.startsWith(monthStr)),
      });
    }

    return new Response(
      JSON.stringify({
        forecasts,
        baselines: {
          avgCourseRevenue,
          avgMembershipRevenue,
          mrrBaseline,
          avgExpensesByCategory,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Forecast generation error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
