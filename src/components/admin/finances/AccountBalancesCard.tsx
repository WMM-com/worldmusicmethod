import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet } from 'lucide-react';
import type { FinancialSummary } from '@/hooks/useFinancialDashboard';

interface Props {
  summary: FinancialSummary | undefined;
  isLoading: boolean;
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export function AccountBalancesCard({ summary, isLoading }: Props) {
  if (isLoading || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Account Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i}>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24 mt-1" />
                <Skeleton className="h-6 w-24 mt-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const accounts = [
    { name: 'PayPal', balances: summary.accountBalances.paypal },
    { name: 'Wise', balances: summary.accountBalances.wise },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Account Balances
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {accounts.map(account => (
            <div key={account.name}>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">{account.name}</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">GBP</span>
                  <span className="font-medium">{formatCurrency(account.balances.GBP, 'GBP')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">USD</span>
                  <span className="font-medium">{formatCurrency(account.balances.USD, 'USD')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">EUR</span>
                  <span className="font-medium">{formatCurrency(account.balances.EUR, 'EUR')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
