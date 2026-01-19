import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet, PiggyBank } from 'lucide-react';
import type { FinancialSummary, CurrencyView } from '@/hooks/useFinancialDashboard';

interface Props {
  summary: FinancialSummary | undefined;
  isLoading: boolean;
  currencyView: CurrencyView;
}

const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatMultiCurrency = (amounts: { GBP: number; USD: number; EUR: number }, view: CurrencyView) => {
  if (view === 'gbp') {
    // Sum all as GBP (assuming already converted)
    const total = amounts.GBP + amounts.USD + amounts.EUR;
    return formatCurrency(total, 'GBP');
  }
  
  const parts = [];
  if (amounts.GBP) parts.push(formatCurrency(amounts.GBP, 'GBP'));
  if (amounts.USD) parts.push(formatCurrency(amounts.USD, 'USD'));
  if (amounts.EUR) parts.push(formatCurrency(amounts.EUR, 'EUR'));
  return parts.length > 0 ? parts.join(' | ') : '£0.00';
};

export function FinancialOverviewCards({ summary, isLoading, currencyView }: Props) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Gross Revenue',
      value: formatMultiCurrency(summary.grossRevenue, currencyView),
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Net Revenue',
      value: formatMultiCurrency(summary.netRevenue, currencyView),
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total Fees',
      value: formatCurrency(summary.fees.total, 'GBP'),
      subtitle: `PayPal: ${formatCurrency(summary.fees.paypal, 'GBP')} | Stripe: ${formatCurrency(summary.fees.stripe, 'GBP')}`,
      icon: CreditCard,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(summary.expenses.total, 'GBP'),
      icon: TrendingDown,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Profit / Loss',
      value: formatCurrency(summary.profitLoss, 'GBP'),
      icon: summary.profitLoss >= 0 ? TrendingUp : TrendingDown,
      color: summary.profitLoss >= 0 ? 'text-green-500' : 'text-red-500',
      bgColor: summary.profitLoss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
    {
      title: 'MRR',
      value: formatCurrency(summary.membershipMetrics.mrr, 'GBP'),
      subtitle: `${summary.membershipMetrics.activeMonthly} monthly | ${summary.membershipMetrics.activeAnnual} annual`,
      icon: PiggyBank,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{card.value}</div>
            {card.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
