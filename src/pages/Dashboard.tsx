import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUpcomingEvents, useEvents } from '@/hooks/useEvents';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';
import { Calendar, TrendingUp, AlertCircle, Coins, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { convertCurrency } from '@/lib/currency';
import { DateRangeFilter, DateRange } from '@/components/filters/DateRangeFilter';

export default function Dashboard() {
  const { data: upcomingEvents = [], isLoading: eventsLoading } = useUpcomingEvents(5);
  const { events } = useEvents();
  const { expenses } = useExpenses();
  const { profile } = useAuth();

  const defaultCurrency = profile?.default_currency || 'GBP';

  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfYear(now),
    to: endOfYear(now),
  });

  const filteredData = useMemo(() => {
    const filteredEvents = events.filter(e => {
      if (e.status !== 'completed') return false;
      const date = parseISO(e.start_time);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });

    const filteredExpenses = expenses.filter(e => {
      const date = parseISO(e.date);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });

    const totalEarnings = filteredEvents.reduce((sum, e) => sum + (e.fee || 0), 0);
    const unpaidEarnings = filteredEvents
      .filter(e => e.payment_status === 'unpaid')
      .reduce((sum, e) => sum + (e.fee || 0), 0);
    
    const totalExpenses = filteredExpenses.reduce((sum, e) => {
      const expenseCurrency = e.currency || defaultCurrency;
      if (expenseCurrency === defaultCurrency) {
        return sum + (e.amount || 0);
      }
      const converted = convertCurrency(e.amount || 0, expenseCurrency, defaultCurrency);
      return sum + converted;
    }, 0);

    return {
      totalEarnings,
      unpaidEarnings,
      totalExpenses,
      netIncome: totalEarnings - totalExpenses,
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
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Your business at a glance</p>
          </div>
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Earnings</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(filteredData.totalEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">Selected period</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unpaid</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(filteredData.unpaidEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
              <Receipt className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(filteredData.totalExpenses)}</div>
              <p className="text-xs text-muted-foreground mt-1">Selected period</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(filteredData.netIncome)}</div>
              <p className="text-xs text-muted-foreground mt-1">Selected period</p>
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
