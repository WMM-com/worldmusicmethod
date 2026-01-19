import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { TrendingDown } from 'lucide-react';
import { CATEGORY_LABELS } from '@/hooks/useFinancialDashboard';
import type { FinancialSummary } from '@/hooks/useFinancialDashboard';

interface Props {
  summary: FinancialSummary | undefined;
  isLoading: boolean;
}

const COLORS = [
  'hsl(355, 74%, 43%)',
  'hsl(222, 100%, 50%)',
  'hsl(142, 76%, 36%)',
  'hsl(54, 82%, 44%)',
  'hsl(280, 70%, 50%)',
  'hsl(180, 70%, 40%)',
  'hsl(30, 80%, 50%)',
  'hsl(320, 70%, 50%)',
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function ExpenseBreakdown({ summary, isLoading }: Props) {
  if (isLoading || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Expense Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  const expenseData = Object.entries(summary.expenses.byCategory || {})
    .filter(([key, value]) => value > 0 && key !== 'ignore')
    .map(([key, value]) => ({
      name: CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] || key,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Expense Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {expenseData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {expenseData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {expenseData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
              
              <div className="border-t pt-2 mt-4">
                <div className="flex justify-between items-center font-bold">
                  <span>Total Expenses</span>
                  <span className="text-red-500">{formatCurrency(summary.expenses.total)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No categorized expenses yet. Categorize transactions to see breakdown.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
