import { useEffect } from 'react';
import { CreditCard, TrendingUp, ShoppingBag, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaymentAccounts, useConnectStripe } from '@/hooks/usePaymentAccounts';
import { useMerchSales, useMerchGigs } from '@/hooks/useMerchandise';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export function MerchOverviewTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: paymentAccounts = [], isLoading: accountsLoading } = usePaymentAccounts();
  const connectStripe = useConnectStripe();
  const { data: gigs = [] } = useMerchGigs();
  const activeGig = gigs.find(g => g.status === 'active');
  const { data: allSales = [], isLoading: salesLoading } = useMerchSales();
  const { data: gigSales = [] } = useMerchSales(activeGig?.id);

  const stripeAccount = paymentAccounts.find(a => a.provider === 'stripe');
  const isStripeConnected = stripeAccount?.onboarding_complete;

  // ── Realtime: listen for new merch_sales inserts ──
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('merch-sales-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'merch_sales',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate all sales queries so the UI refreshes
          queryClient.invalidateQueries({ queryKey: ['merch-sales'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Revenue calculations
  const totalRevenue = allSales.reduce((sum, s) => sum + Number(s.total), 0);
  const activeGigRevenue = gigSales.reduce((sum, s) => sum + Number(s.total), 0);
  const recentSales = allSales.slice(0, 10);

  const defaultCurrency = activeGig?.currency || 'USD';

  return (
    <div className="space-y-6">
      {/* Stripe Connect Banner */}
      {!accountsLoading && !isStripeConnected && (
        <Card className="border-secondary/30 bg-secondary/5">
          <CardContent className="py-8 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center">
              <CreditCard className="h-7 w-7 text-secondary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Connect with Stripe</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                Connect your Stripe account to accept card payments for merchandise at gigs and online.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => connectStripe.mutate()}
              disabled={connectStripe.isPending}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {connectStripe.isPending ? 'Connecting...' : 'Connect with Stripe'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue, defaultCurrency)}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Gig Revenue</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : activeGig ? (
              <>
                <p className="text-2xl font-bold">{formatCurrency(activeGigRevenue, activeGig.currency)}</p>
                <p className="text-xs text-muted-foreground mt-1">{activeGig.name}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground mt-1">No active gig</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">{allSales.length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {salesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : recentSales.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No sales recorded yet. Sales will appear here as they come in.
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-4 w-4 text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {sale.product?.title || 'Unknown product'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sale.created_at), 'dd MMM yyyy, HH:mm')}
                        {sale.buyer_name && ` · ${sale.buyer_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-semibold text-sm">{formatCurrency(sale.total, sale.currency)}</p>
                    <Badge variant="outline" className="text-xs capitalize">{sale.payment_method}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
