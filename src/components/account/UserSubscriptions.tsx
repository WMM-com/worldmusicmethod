import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Loader2, RefreshCw, X, RotateCcw, Calendar, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function UserSubscriptions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [newPrice, setNewPrice] = useState<number>(0);

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['user-subscriptions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, products(name, product_type, pwyf_enabled, pwyf_min_price_usd, pwyf_max_price_usd, pwyf_suggested_price_usd)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'cancel', subscriptionId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      if (data.status === 'pending_cancellation') {
        toast.success('Subscription will be cancelled at the end of your billing period');
      } else {
        toast.success('Subscription cancelled');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel subscription');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'reactivate', subscriptionId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      toast.success('Subscription reactivated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reactivate subscription');
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ subscriptionId, amount }: { subscriptionId: string; amount: number }) => {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'update_price', subscriptionId, data: { newAmount: amount } }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      toast.success('Subscription price updated');
      setPriceDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update price');
    },
  });

  const formatPrice = (amount: number, currency: string = 'USD') => {
    const symbols: Record<string, string> = { USD: '$', GBP: '£', EUR: '€' };
    return `${symbols[currency] || currency}${(amount || 0).toFixed(2)}`;
  };

  const openPriceDialog = (sub: any) => {
    setSelectedSubscription(sub);
    setNewPrice(Number(sub.amount) || 0);
    setPriceDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trialing: 'secondary',
      pending_cancellation: 'outline',
      paused: 'outline',
      cancelled: 'destructive',
    };
    const labels: Record<string, string> = {
      pending_cancellation: 'Cancels Soon',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>Manage your active subscriptions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {subscriptions?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active subscriptions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions?.map((sub) => {
              const baseAmount = Number(sub.amount || 0);
              const discountAmount = Number(sub.coupon_discount || 0);
              const hasCoupon = Boolean(sub.coupon_code) && discountAmount > 0;
              const effectiveAmount = hasCoupon ? Math.max(baseAmount - discountAmount, 0) : baseAmount;

              return (
                <Card key={sub.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {sub.products?.name || sub.product_name || 'Subscription'}
                          </h4>
                          {getStatusBadge(sub.status)}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span className="font-medium">
                            {hasCoupon && (
                              <span className="mr-2 text-xs line-through text-muted-foreground">
                                {formatPrice(baseAmount, sub.currency)}
                              </span>
                            )}
                            {formatPrice(effectiveAmount, sub.currency)}/{sub.interval}
                          </span>
                          {sub.coupon_code && (
                            <Badge variant="secondary" className="text-xs">
                              {sub.coupon_code}
                              {hasCoupon ? ` (-${formatPrice(discountAmount, sub.currency)})` : ''}
                            </Badge>
                          )}
                        </div>
                        {sub.current_period_end && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {sub.status === 'pending_cancellation'
                              ? `Access until ${format(new Date(sub.cancels_at || sub.current_period_end), 'MMM d, yyyy')}`
                              : `Next billing: ${format(new Date(sub.current_period_end), 'MMM d, yyyy')}`}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Change Price button - only for PWYF subscriptions */}
                        {sub.status === 'active' && sub.products?.pwyf_enabled && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPriceDialog(sub)}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Change Price
                          </Button>
                        )}

                        {sub.status === 'active' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Your subscription will remain active until the end of your current billing period.
                                  After that, you will lose access to the included content.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelMutation.mutate(sub.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {cancelMutation.isPending && (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  )}
                                  Cancel Subscription
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {sub.status === 'pending_cancellation' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reactivateMutation.mutate(sub.id)}
                            disabled={reactivateMutation.isPending}
                          >
                            {reactivateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <RotateCcw className="h-4 w-4 mr-1" />
                            )}
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Price Change Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Price</DialogTitle>
            <DialogDescription>
              Adjust how much you pay for this subscription. Changes take effect on your next billing date.
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">New price</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-medium">
                      {formatPrice(0, selectedSubscription.currency).charAt(0)}
                    </span>
                    <Input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(Math.max(
                        selectedSubscription.products?.pwyf_min_price_usd || 1,
                        Math.min(
                          selectedSubscription.products?.pwyf_max_price_usd || 1000,
                          parseInt(e.target.value) || 0
                        )
                      ))}
                      className="w-24 h-9 text-center font-semibold"
                    />
                    <span className="text-sm text-muted-foreground">/{selectedSubscription.interval}</span>
                  </div>
                </div>

                <Slider
                  value={[newPrice]}
                  onValueChange={(vals) => setNewPrice(vals[0])}
                  min={selectedSubscription.products?.pwyf_min_price_usd || 1}
                  max={selectedSubscription.products?.pwyf_max_price_usd || 100}
                  step={1}
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Min: {formatPrice(selectedSubscription.products?.pwyf_min_price_usd || 1, selectedSubscription.currency)}</span>
                  <span>Max: {formatPrice(selectedSubscription.products?.pwyf_max_price_usd || 100, selectedSubscription.currency)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedSubscription && updatePriceMutation.mutate({ 
                subscriptionId: selectedSubscription.id, 
                amount: newPrice 
              })}
              disabled={updatePriceMutation.isPending}
            >
              {updatePriceMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
