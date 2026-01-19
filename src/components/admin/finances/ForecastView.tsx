import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ForecastMonth {
  month: string;
  income: number;
  expenses: number;
  profit: number;
  incomeBreakdown: {
    courses: number;
    memberships: number;
  };
  expenseBreakdown: Record<string, number>;
  isOverride: boolean;
}

interface Props {
  forecast: { months: ForecastMonth[] } | undefined;
  isLoading: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function ForecastView({ forecast, isLoading }: Props) {
  if (isLoading || !forecast) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cash Flow Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = forecast.months.map(m => ({
    month: format(parseISO(m.month + '-01'), 'MMM yy'),
    Income: m.income,
    Expenses: m.expenses,
    Profit: m.profit,
  }));

  const threeMonthData = chartData.slice(0, 3);
  const twelveMonthData = chartData;

  const totals = {
    threeMonth: forecast.months.slice(0, 3).reduce((acc, m) => ({
      income: acc.income + m.income,
      expenses: acc.expenses + m.expenses,
      profit: acc.profit + m.profit,
    }), { income: 0, expenses: 0, profit: 0 }),
    twelveMonth: forecast.months.reduce((acc, m) => ({
      income: acc.income + m.income,
      expenses: acc.expenses + m.expenses,
      profit: acc.profit + m.profit,
    }), { income: 0, expenses: 0, profit: 0 }),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Cash Flow Forecast
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="3month">
          <TabsList className="mb-4">
            <TabsTrigger value="3month">3 Month</TabsTrigger>
            <TabsTrigger value="12month">12 Month</TabsTrigger>
          </TabsList>

          <TabsContent value="3month">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg border bg-green-500/10">
                <p className="text-sm text-muted-foreground">Projected Income</p>
                <p className="text-xl font-bold text-green-500">{formatCurrency(totals.threeMonth.income)}</p>
              </div>
              <div className="p-4 rounded-lg border bg-red-500/10">
                <p className="text-sm text-muted-foreground">Projected Expenses</p>
                <p className="text-xl font-bold text-red-500">{formatCurrency(totals.threeMonth.expenses)}</p>
              </div>
              <div className="p-4 rounded-lg border bg-blue-500/10">
                <p className="text-sm text-muted-foreground">Projected Profit</p>
                <p className={`text-xl font-bold ${totals.threeMonth.profit >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                  {formatCurrency(totals.threeMonth.profit)}
                </p>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={threeMonthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(v) => `£${v/1000}k`} className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar dataKey="Income" fill="hsl(142, 76%, 36%)" />
                  <Bar dataKey="Expenses" fill="hsl(355, 74%, 43%)" />
                  <Bar dataKey="Profit" fill="hsl(222, 100%, 50%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="12month">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg border bg-green-500/10">
                <p className="text-sm text-muted-foreground">Projected Income</p>
                <p className="text-xl font-bold text-green-500">{formatCurrency(totals.twelveMonth.income)}</p>
              </div>
              <div className="p-4 rounded-lg border bg-red-500/10">
                <p className="text-sm text-muted-foreground">Projected Expenses</p>
                <p className="text-xl font-bold text-red-500">{formatCurrency(totals.twelveMonth.expenses)}</p>
              </div>
              <div className="p-4 rounded-lg border bg-blue-500/10">
                <p className="text-sm text-muted-foreground">Projected Profit</p>
                <p className={`text-xl font-bold ${totals.twelveMonth.profit >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                  {formatCurrency(totals.twelveMonth.profit)}
                </p>
              </div>
            </div>

            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={twelveMonthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(v) => `£${v/1000}k`} className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Income" stroke="hsl(142, 76%, 36%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="Expenses" stroke="hsl(355, 74%, 43%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="Profit" stroke="hsl(222, 100%, 50%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly breakdown table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecast.months.map(month => (
                    <TableRow key={month.month}>
                      <TableCell className="font-medium">
                        {format(parseISO(month.month + '-01'), 'MMMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right text-green-500">
                        {formatCurrency(month.income)}
                      </TableCell>
                      <TableCell className="text-right text-red-500">
                        {formatCurrency(month.expenses)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${month.profit >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                        {formatCurrency(month.profit)}
                      </TableCell>
                      <TableCell>
                        {month.isOverride && (
                          <Badge variant="outline" className="text-xs">Manual</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
