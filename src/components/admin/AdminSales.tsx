import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { format, subDays } from 'date-fns';
import { 
  DollarSign, 
  RefreshCw, 
  CreditCard, 
  Search,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  X,
  Edit,
  Tag,
  Loader2,
  TrendingUp,
  TrendingDown,
  Undo2,
  RotateCcw
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DateRange = '7d' | '30d' | '90d' | 'all';

export function AdminSales() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [ordersPage, setOrdersPage] = useState(1);
  const [subsPage, setSubsPage] = useState(1);
  const [ordersSearch, setOrdersSearch] = useState('');
  const [subsSearch, setSubsSearch] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  
  // Subscription management dialogs
  const [editPriceDialog, setEditPriceDialog] = useState<{ open: boolean; subscription: any }>({ open: false, subscription: null });
  const [couponDialog, setCouponDialog] = useState<{ open: boolean; subscription: any }>({ open: false, subscription: null });
  const [refundDialog, setRefundDialog] = useState<{ open: boolean; order: any }>({ open: false, order: null });
  const [newPrice, setNewPrice] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const PAGE_SIZE = 30;

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

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-sales-stats', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-sales-data', {
        body: { 
          type: 'stats', 
          dateFrom: getDateFilter() 
        }
      });
      if (error) throw error;
      return data;
    },
  });

  // Fetch orders with pagination and search
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['admin-orders', dateRange, ordersPage, ordersSearch],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-sales-data', {
        body: { 
          type: 'orders',
          page: ordersPage,
          limit: PAGE_SIZE,
          search: ordersSearch || undefined,
          dateFrom: getDateFilter()
        }
      });
      if (error) throw error;
      return data;
    },
  });

  // Fetch subscriptions with pagination and search
  const { data: subsData, isLoading: subsLoading, refetch: refetchSubs } = useQuery({
    queryKey: ['admin-subscriptions', dateRange, subsPage, subsSearch],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-sales-data', {
        body: { 
          type: 'subscriptions',
          page: subsPage,
          limit: PAGE_SIZE,
          search: subsSearch || undefined,
          dateFrom: getDateFilter()
        }
      });
      if (error) throw error;
      return data;
    },
  });

  // Subscription management mutations
  const manageSub = useMutation({
    mutationFn: async ({ action, subscriptionId, data }: { action: string; subscriptionId: string; data?: any }) => {
      const { data: result, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action, subscriptionId, data }
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sales-stats'] });
      toast.success('Subscription updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update subscription');
    },
  });

  // Refund mutation
  const processRefund = useMutation({
    mutationFn: async ({ orderId, amount, reason }: { orderId: string; amount?: number; reason?: string }) => {
      const { data: result, error } = await supabase.functions.invoke('process-refund', {
        body: { orderId, amount, reason }
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sales-stats'] });
      toast.success(data.isFullRefund ? 'Full refund processed' : 'Partial refund processed');
      setRefundDialog({ open: false, order: null });
      setRefundAmount('');
      setRefundReason('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to process refund');
    },
  });

  const formatPrice = (amount: number, currency: string = 'USD') => {
    const symbols: Record<string, string> = { USD: '$', GBP: '£', EUR: '€' };
    return `${symbols[currency] || currency}${(amount || 0).toFixed(2)}`;
  };

  const handleAction = (action: string, subscription: any) => {
    if (action === 'edit_price') {
      setNewPrice(subscription.amount?.toString() || '');
      setEditPriceDialog({ open: true, subscription });
    } else if (action === 'apply_coupon') {
      setCouponCode(subscription.coupon_code || '');
      setCouponDiscount(subscription.coupon_discount?.toString() || '');
      setCouponDialog({ open: true, subscription });
    } else {
      manageSub.mutate({ action, subscriptionId: subscription.id });
    }
  };

  const handlePriceUpdate = () => {
    if (!newPrice || isNaN(parseFloat(newPrice))) {
      toast.error('Please enter a valid price');
      return;
    }
    manageSub.mutate({ 
      action: 'update_price', 
      subscriptionId: editPriceDialog.subscription.id,
      data: { newAmount: parseFloat(newPrice) }
    });
    setEditPriceDialog({ open: false, subscription: null });
  };

  const handleCouponUpdate = () => {
    if (!couponCode) {
      toast.error('Please enter a coupon code');
      return;
    }
    manageSub.mutate({ 
      action: 'apply_coupon', 
      subscriptionId: couponDialog.subscription.id,
      data: { couponCode: couponCode.toUpperCase() }
    });
    setCouponDialog({ open: false, subscription: null });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      completed: 'default',
      trialing: 'secondary',
      paused: 'outline',
      pending_cancellation: 'outline',
      cancelled: 'destructive',
      refunded: 'destructive',
      partial_refund: 'outline',
      pending: 'secondary',
    };
    const labels: Record<string, string> = {
      pending_cancellation: 'Cancels Soon',
      partial_refund: 'Partial Refund',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const handleRefund = (order: any) => {
    setRefundAmount(order.amount?.toString() || '');
    setRefundReason('');
    setRefundDialog({ open: true, order });
  };

  const submitRefund = () => {
    if (!refundAmount || isNaN(parseFloat(refundAmount))) {
      toast.error('Please enter a valid refund amount');
      return;
    }
    processRefund.mutate({
      orderId: refundDialog.order.id,
      amount: parseFloat(refundAmount),
      reason: refundReason || 'requested_by_customer',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold">Sales Dashboard</h3>
          <p className="text-sm text-muted-foreground">Revenue, orders, and subscriptions with fees</p>
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
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
              refetchOrders();
              refetchSubs();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Currency breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue by Currency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['GBP', 'USD', 'EUR'].map((curr) => {
              const revenue = stats?.revenueByCurrency?.[curr] || 0;
              const net = stats?.netByCurrency?.[curr] || 0;
              if (revenue === 0 && net === 0) return null;
              return (
                <div key={curr} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{curr}</p>
                  <p className="text-lg font-bold">{formatPrice(revenue, curr)}</p>
                  <p className="text-xs text-green-600">Net: {formatPrice(net, curr)}</p>
                </div>
              );
            })}
            <div className="space-y-1 border-l pl-4">
              <p className="text-xs text-muted-foreground">Combined (USD)</p>
              <p className="text-lg font-bold">{formatPrice(stats?.combinedRevenueUSD || 0, 'USD')}</p>
              <p className="text-xs text-green-600">Net: {formatPrice(stats?.combinedNetUSD || 0, 'USD')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatPrice(stats?.combinedFeesUSD || 0, 'USD')}</p>
                <p className="text-xs text-muted-foreground">Total Fees (USD)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.completedOrdersCount || 0}</p>
                <p className="text-xs text-muted-foreground">Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.activeSubscriptionsCount || 0}</p>
                <p className="text-xs text-muted-foreground">Active Subs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatPrice(stats?.monthlyRecurringRevenue || 0, 'USD')}</p>
                <p className="text-xs text-muted-foreground">MRR</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Undo2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.refundedOrdersCount || 0}</p>
                <p className="text-xs text-muted-foreground">Refunds</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee breakdown */}
      {(stats?.totalStripeFees > 0 || stats?.totalPaypalFees > 0) && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground">Fee breakdown:</span>
              <span>Stripe: <strong>{formatPrice(stats?.totalStripeFees || 0, 'USD')}</strong></span>
              <span>PayPal: <strong>{formatPrice(stats?.totalPaypalFees || 0, 'USD')}</strong></span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">Orders ({ordersData?.total || 0})</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions ({subsData?.total || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Orders</CardTitle>
                  <CardDescription>All transactions with fee information</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or name..."
                    value={ordersSearch}
                    onChange={(e) => {
                      setOrdersSearch(e.target.value);
                      setOrdersPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Coupon</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : ordersData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    ordersData?.data?.map((order: any) => {
                      const fee = order.stripe_fee || order.paypal_fee || 0;
                      const net = order.net_amount || (order.amount - fee);
                      
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(order.created_at), 'MMM d, HH:mm')}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{order.customer_name || '-'}</p>
                              <p className="text-xs text-muted-foreground">{order.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{order.products?.name}</p>
                              <Badge variant="outline" className="text-xs">
                                {order.products?.product_type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(order.amount, order.currency)}
                          </TableCell>
                          <TableCell>
                            {order.coupon_code ? (
                              <div>
                                <Badge variant="outline" className="text-xs">
                                  {order.coupon_code}
                                </Badge>
                                {order.coupon_discount > 0 && (
                                  <p className="text-xs text-green-600 mt-0.5">
                                    -{formatPrice(order.coupon_discount, order.currency)}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm text-destructive">
                            -{formatPrice(fee, order.currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-green-600 font-medium">
                            {formatPrice(net, order.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize text-xs">
                              {order.payment_provider}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.status)}
                          </TableCell>
                          <TableCell>
                            {order.status === 'completed' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleRefund(order)}
                                title="Refund"
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {ordersData?.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {ordersPage} of {ordersData.totalPages} ({ordersData.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                      disabled={ordersPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOrdersPage(p => Math.min(ordersData.totalPages, p + 1))}
                      disabled={ordersPage === ordersData.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Subscriptions</CardTitle>
                  <CardDescription>Manage active and cancelled subscriptions</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or name..."
                    value={subsSearch}
                    onChange={(e) => {
                      setSubsSearch(e.target.value);
                      setSubsPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Coupon</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subsLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : subsData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No subscriptions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    subsData?.data?.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(sub.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{sub.customer_name || '-'}</p>
                            <p className="text-xs text-muted-foreground">{sub.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {sub.products?.name}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(sub.amount, sub.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {sub.interval}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sub.coupon_code ? (
                            <Badge variant="secondary" className="text-xs">
                              {sub.coupon_code} ({sub.coupon_discount}%)
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {sub.current_period_end
                            ? format(new Date(sub.current_period_end), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(sub.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {sub.status === 'active' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleAction('pause', sub)}
                                  title="Pause"
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleAction('cancel', sub)}
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {sub.status === 'paused' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleAction('resume', sub)}
                                title="Resume"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            {sub.status !== 'cancelled' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleAction('edit_price', sub)}
                                  title="Edit Price"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleAction('apply_coupon', sub)}
                                  title="Coupon"
                                >
                                  <Tag className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {subsData?.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {subsPage} of {subsData.totalPages} ({subsData.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSubsPage(p => Math.max(1, p - 1))}
                      disabled={subsPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSubsPage(p => Math.min(subsData.totalPages, p + 1))}
                      disabled={subsPage === subsData.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Price Dialog */}
      <Dialog open={editPriceDialog.open} onOpenChange={(open) => setEditPriceDialog({ open, subscription: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Price (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="99.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPriceDialog({ open: false, subscription: null })}>
              Cancel
            </Button>
            <Button onClick={handlePriceUpdate} disabled={manageSub.isPending}>
              {manageSub.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coupon Dialog */}
      <Dialog open={couponDialog.open} onOpenChange={(open) => setCouponDialog({ open, subscription: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {couponDialog.subscription?.coupon_code ? 'Update Coupon' : 'Apply Coupon'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Coupon Code</Label>
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="SUMMER20"
              />
              <p className="text-xs text-muted-foreground">
                Enter an existing coupon code from the Coupons tab
              </p>
            </div>
          </div>
          <DialogFooter>
            {couponDialog.subscription?.coupon_code && (
              <Button 
                variant="destructive" 
                onClick={() => {
                  manageSub.mutate({ action: 'remove_coupon', subscriptionId: couponDialog.subscription.id });
                  setCouponDialog({ open: false, subscription: null });
                }}
              >
                Remove Coupon
              </Button>
            )}
            <Button variant="outline" onClick={() => setCouponDialog({ open: false, subscription: null })}>
              Cancel
            </Button>
            <Button onClick={handleCouponUpdate} disabled={manageSub.isPending}>
              {manageSub.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Apply Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialog.open} onOpenChange={(open) => setRefundDialog({ open, order: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Refund will be processed via {refundDialog.order?.payment_provider}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Refund Amount ({refundDialog.order?.currency || 'USD'})</Label>
              <Input
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={refundDialog.order?.amount?.toString()}
              />
              <p className="text-xs text-muted-foreground">
                Original amount: {refundDialog.order?.amount?.toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Customer requested refund..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog({ open: false, order: null })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={submitRefund} 
              disabled={processRefund.isPending}
            >
              {processRefund.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
