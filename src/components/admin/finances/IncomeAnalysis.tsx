import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DollarSign } from 'lucide-react';
import type { FinancialSummary, CurrencyView } from '@/hooks/useFinancialDashboard';

interface Props {
  summary: FinancialSummary | undefined;
  isLoading: boolean;
  currencyView: CurrencyView;
}

const COLORS = ['hsl(142, 76%, 36%)', 'hsl(222, 100%, 50%)', 'hsl(54, 82%, 44%)', 'hsl(355, 74%, 43%)'];

const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function IncomeAnalysis({ summary, isLoading, currencyView }: Props) {
  if (isLoading || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Income Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Revenue by source
  const revenueBySource = [
    { name: 'PayPal', value: summary.grossRevenue.USD + summary.grossRevenue.EUR * 0.5 }, // Estimate
    { name: 'Stripe (via Wise)', value: summary.grossRevenue.GBP },
  ].filter(item => item.value > 0);

  // Fee breakdown
  const feeData = [
    { name: 'PayPal Fees', value: summary.fees.paypal },
    { name: 'Stripe Fees', value: summary.fees.stripe },
    { name: 'Conversion Fees', value: summary.fees.conversion },
  ].filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Income Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue by Currency */}
          <div>
            <h4 className="font-medium mb-4 text-sm text-muted-foreground">Revenue by Currency</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="font-medium">GBP</span>
                <span className="text-green-500 font-bold">{formatCurrency(summary.grossRevenue.GBP, 'GBP')}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="font-medium">USD</span>
                <span className="text-green-500 font-bold">{formatCurrency(summary.grossRevenue.USD, 'USD')}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="font-medium">EUR</span>
                <span className="text-green-500 font-bold">{formatCurrency(summary.grossRevenue.EUR, 'EUR')}</span>
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          <div>
            <h4 className="font-medium mb-4 text-sm text-muted-foreground">Fee Breakdown</h4>
            {feeData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={feeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {feeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No fee data available
              </div>
            )}
          </div>
        </div>

        {/* Net Revenue Calculation */}
        <div className="mt-6 p-4 rounded-lg border bg-muted/30">
          <h4 className="font-medium mb-3">Net Revenue Calculation</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Gross Revenue</p>
              <p className="font-bold text-green-500">
                {formatCurrency(summary.grossRevenue.GBP + summary.grossRevenue.USD + summary.grossRevenue.EUR)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">- PayPal Fees</p>
              <p className="font-bold text-red-500">-{formatCurrency(summary.fees.paypal)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">- Stripe Fees</p>
              <p className="font-bold text-red-500">-{formatCurrency(summary.fees.stripe)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">= Net Revenue</p>
              <p className="font-bold text-blue-500">
                {formatCurrency(summary.netRevenue.GBP + summary.netRevenue.USD + summary.netRevenue.EUR)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
