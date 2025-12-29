import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEvents } from '@/hooks/useEvents';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/contexts/AuthContext';
import { TaxEstimator } from '@/components/finances/TaxEstimator';
import { OtherIncomeSection } from '@/components/finances/OtherIncomeSection';
import { IncomeProofShareSection } from '@/components/finances/IncomeProofShare';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency, convertCurrency } from '@/lib/currency';
import { DateRangeFilter, DateRange } from '@/components/filters/DateRangeFilter';
import { startOfYear, endOfYear, isWithinInterval, parseISO, startOfMonth, endOfMonth, format } from 'date-fns';

const COLORS = ['hsl(262, 83%, 58%)', 'hsl(173, 80%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(340, 75%, 55%)', 'hsl(210, 80%, 55%)'];

export default function Finances() {
  const { profile } = useAuth();
  const defaultCurrency = profile?.default_currency || 'GBP';
  const { events } = useEvents();
  const { expenses } = useExpenses();

  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfYear(now),
    to: endOfYear(now),
  });

  const filteredData = useMemo(() => {
    // Include all events with fees (not just completed) for full financial picture
    const filteredEvents = events.filter(e => {
      if (!e.fee || e.fee <= 0) return false;
      const date = parseISO(e.start_time);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });

    const filteredExpenses = expenses.filter(e => {
      const date = parseISO(e.date);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });

    // Total earnings from all events, converted to default currency
    const totalEarnings = filteredEvents.reduce((sum, e) => {
      const eventCurrency = e.currency || defaultCurrency;
      const fee = e.fee || 0;
      if (eventCurrency === defaultCurrency) {
        return sum + fee;
      }
      return sum + convertCurrency(fee, eventCurrency, defaultCurrency);
    }, 0);
    
    const totalExpenses = filteredExpenses.reduce((sum, e) => {
      const expenseCurrency = e.currency || defaultCurrency;
      if (expenseCurrency === defaultCurrency) {
        return sum + (e.amount || 0);
      }
      return sum + convertCurrency(e.amount || 0, expenseCurrency, defaultCurrency);
    }, 0);

    // Expenses by category
    const categories: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      if (!categories[e.category]) {
        categories[e.category] = 0;
      }
      const expenseCurrency = e.currency || defaultCurrency;
      const amount = expenseCurrency === defaultCurrency 
        ? (e.amount || 0) 
        : convertCurrency(e.amount || 0, expenseCurrency, defaultCurrency);
      categories[e.category] += amount;
    });
    const expensesByCategory = Object.entries(categories).map(([name, value]) => ({
      name,
      value,
    }));

    // Monthly data - generate months within the date range
    const monthlyData: { month: string; earnings: number; expenses: number; net: number }[] = [];
    let currentMonth = startOfMonth(dateRange.from);
    const endMonth = endOfMonth(dateRange.to);
    
    while (currentMonth <= endMonth) {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const monthName = format(currentMonth, 'MMM');

      const monthEvents = filteredEvents.filter(e => {
        const eventDate = parseISO(e.start_time);
        return isWithinInterval(eventDate, { start: monthStart, end: monthEnd });
      });
      // Convert each event fee to default currency
      const monthEarnings = monthEvents.reduce((sum, e) => {
        const eventCurrency = e.currency || defaultCurrency;
        const fee = e.fee || 0;
        if (eventCurrency === defaultCurrency) {
          return sum + fee;
        }
        return sum + convertCurrency(fee, eventCurrency, defaultCurrency);
      }, 0);

      const monthExpenses = filteredExpenses.filter(e => {
        const expenseDate = parseISO(e.date);
        return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
      });
      const monthExpenseTotal = monthExpenses.reduce((sum, e) => {
        const expenseCurrency = e.currency || defaultCurrency;
        const amount = expenseCurrency === defaultCurrency 
          ? (e.amount || 0) 
          : convertCurrency(e.amount || 0, expenseCurrency, defaultCurrency);
        return sum + amount;
      }, 0);

      monthlyData.push({
        month: monthName,
        earnings: monthEarnings,
        expenses: monthExpenseTotal,
        net: monthEarnings - monthExpenseTotal,
      });

      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }

    return {
      totalEarnings,
      totalExpenses,
      netIncome: totalEarnings - totalExpenses,
      expensesByCategory,
      monthlyData,
    };
  }, [events, expenses, dateRange, defaultCurrency]);

  const formatAmount = (amount: number) => {
    return formatCurrency(amount, defaultCurrency);
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Finances</h1>
            <p className="text-muted-foreground mt-1">Track your earnings and expenses</p>
          </div>
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatAmount(filteredData.totalEarnings)}</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatAmount(filteredData.totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Net Income</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{formatAmount(filteredData.netIncome)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Monthly Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData.monthlyData}>
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredData.expensesByCategory.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No expenses recorded
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredData.expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => `${name}: ${formatAmount(value)}`}
                      >
                        {filteredData.expensesByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Other Income Section */}
        <OtherIncomeSection />

        {/* Income Proof Sharing */}
        <IncomeProofShareSection />

        {/* Tax Estimator Section */}
        <TaxEstimator />
      </div>
    </AppLayout>
  );
}
