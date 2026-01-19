import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, UserPlus, UserMinus, Target, RotateCcw } from 'lucide-react';
import type { FinancialSummary } from '@/hooks/useFinancialDashboard';

interface Props {
  summary: FinancialSummary | undefined;
  isLoading: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

export function MembershipAnalytics({ summary, isLoading }: Props) {
  if (isLoading || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membership Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="p-4 rounded-lg border">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { membershipMetrics } = summary;
  const netGrowth = membershipMetrics.newThisMonth - membershipMetrics.cancelledThisMonth;

  const metrics = [
    {
      label: 'Active Monthly',
      value: membershipMetrics.activeMonthly,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      label: 'Active Annual',
      value: membershipMetrics.activeAnnual,
      icon: Users,
      color: 'text-purple-500',
    },
    {
      label: 'New This Month',
      value: `+${membershipMetrics.newThisMonth}`,
      icon: UserPlus,
      color: 'text-green-500',
    },
    {
      label: 'Cancelled',
      value: membershipMetrics.cancelledThisMonth,
      icon: UserMinus,
      color: 'text-red-500',
    },
    {
      label: 'Net Growth',
      value: netGrowth >= 0 ? `+${netGrowth}` : netGrowth,
      icon: TrendingUp,
      color: netGrowth >= 0 ? 'text-green-500' : 'text-red-500',
    },
    {
      label: 'MRR',
      value: formatCurrency(membershipMetrics.mrr),
      icon: Target,
      color: 'text-yellow-500',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Membership Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {metrics.map(metric => (
            <div key={metric.label} className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
                <span className="text-sm text-muted-foreground">{metric.label}</span>
              </div>
              <p className="text-2xl font-bold">{metric.value}</p>
            </div>
          ))}
        </div>

        {/* Trial Conversion */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            7-Day Trial Conversion
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{membershipMetrics.trialsStarted}</p>
              <p className="text-xs text-muted-foreground">Trials Started</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-green-500">{membershipMetrics.trialsConverted}</p>
              <p className="text-xs text-muted-foreground">Converted</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{formatPercent(membershipMetrics.trialConversionRate)}</p>
              <p className="text-xs text-muted-foreground">Conversion Rate</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
