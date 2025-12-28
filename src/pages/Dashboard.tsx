import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUpcomingEvents } from '@/hooks/useEvents';
import { useFinancials } from '@/hooks/useFinancials';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Calendar, TrendingUp, AlertCircle, Coins } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '@/lib/currency';

export default function Dashboard() {
  const { data: upcomingEvents = [], isLoading: eventsLoading } = useUpcomingEvents(5);
  const { summary } = useFinancials();
  const { profile } = useAuth();

  const defaultCurrency = profile?.default_currency || 'GBP';

  const formatAmount = (amount: number) => {
    return formatCurrency(amount, defaultCurrency);
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your business at a glance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Earnings</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(summary.monthlyEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unpaid Invoices</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(summary.unpaidEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(summary.yearlyEarnings - summary.yearlyExpenses)}</div>
              <p className="text-xs text-muted-foreground mt-1">This year</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingEvents.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Next 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No upcoming events</div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div className="space-y-1">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.venue_name && `${event.venue_name} • `}
                        {format(new Date(event.start_time), 'EEE, MMM d • h:mm a')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatAmount(event.fee || 0)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        event.status === 'confirmed' ? 'bg-success/20 text-success' :
                        event.status === 'pencilled' ? 'bg-warning/20 text-warning' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
