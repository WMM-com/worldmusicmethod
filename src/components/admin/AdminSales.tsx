import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { DollarSign, TrendingUp, ShoppingCart, RefreshCw, CreditCard, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DateRange = '7d' | '30d' | '90d' | 'all';

export function AdminSales() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d':
        return subDays(now, 7).toISOString();
      case '30d':
        return subDays(now, 30).toISOString();
      case '90d':
        return subDays(now, 90).toISOString();
      default:
        return null;
    }
  };

  // Fetch orders
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          products:product_id (name, product_type)
        `)
        .order('created_at', { ascending: false });

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch subscriptions
  const { data: subscriptions } = useQuery({
    queryKey: ['admin-subscriptions', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          products:product_id (name)
        `)
        .order('created_at', { ascending: false });

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Calculate stats
  const totalRevenue = orders?.reduce((sum, order) => 
    order.status === 'completed' ? sum + (order.amount || 0) : sum, 0) || 0;
  
  const completedOrders = orders?.filter((o) => o.status === 'completed').length || 0;
  const refundedOrders = orders?.filter((o) => o.status === 'refunded').length || 0;
  const activeSubscriptions = subscriptions?.filter((s) => s.status === 'active').length || 0;

  const formatPrice = (amount: number, currency: string = 'USD') => {
    const symbols: Record<string, string> = { USD: '$', GBP: '£', EUR: '€' };
    return `${symbols[currency] || currency}${amount.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sales Dashboard</h3>
          <p className="text-sm text-muted-foreground">Track revenue, orders, and subscriptions</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedOrders}</p>
                <p className="text-sm text-muted-foreground">Completed Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSubscriptions}</p>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{refundedOrders}</p>
                <p className="text-sm text-muted-foreground">Refunds</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest transactions across all products</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : orders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No orders found for this period
                  </TableCell>
                </TableRow>
              ) : (
                orders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-sm">
                      {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{order.email}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{(order.products as any)?.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {(order.products as any)?.product_type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatPrice(order.amount, order.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {order.payment_provider}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.status === 'completed'
                            ? 'default'
                            : order.status === 'refunded'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
          <CardDescription>Currently active subscription memberships</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Next Billing</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No subscriptions yet
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions?.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="text-sm">
                      {format(new Date(sub.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {(sub.products as any)?.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {sub.payment_provider}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {sub.current_period_end
                        ? format(new Date(sub.current_period_end), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.status === 'active'
                            ? 'default'
                            : sub.status === 'trialing'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
