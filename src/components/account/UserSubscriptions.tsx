import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Loader2, RefreshCw, X, RotateCcw, Calendar, DollarSign, CreditCard, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Stripe Element styles - using light colors for visibility on any background
const CARD_ELEMENT_STYLE = {
  base: {
    fontSize: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#374151',
    '::placeholder': {
      color: '#9ca3af',
    },
  },
  invalid: {
    color: '#dc2626',
  },
};

// Payment Method Update Form Component (inside Elements)
function UpdatePaymentForm({ 
  subscription, 
  onSuccess, 
  onCancel 
}: { 
  subscription: any;
  onSuccess: () => void; 
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPayPalSubscription = subscription.payment_provider === 'paypal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      toast.error('Payment system not ready');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        throw new Error('Card input not found');
      }

      // Create payment method
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
      });

      if (pmError) {
        throw new Error(pmError.message);
      }

      if (isPayPalSubscription) {
        // Switching from PayPal to Stripe with 3DS/SCA support
        toast.info('Attempting to update payment method...');
        
        const { data, error: switchError } = await supabase.functions.invoke('manage-subscription', {
          body: {
            action: 'switch_to_stripe',
            subscriptionId: subscription.id,
            data: { paymentMethodId: paymentMethod.id }
          }
        });

        if (switchError) throw switchError;
        if (data?.error) throw new Error(data.error);

        // Check if 3DS confirmation is required
        if (data?.requiresConfirmation && data?.clientSecret) {
          toast.info('Confirming your card with 3D Secure...');
          
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret);
          
          if (confirmError) {
            // If 3DS fails, the subscription stays incomplete and will be cleaned up by Stripe
            throw new Error(confirmError.message || '3D Secure verification failed');
          }
          
          // After 3DS, payment intent status can be 'succeeded' or 'requires_capture'
          // For subscriptions, it typically succeeds immediately
          if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'requires_capture') {
            // 3DS succeeded - now confirm the switch on the backend with retry logic
            let confirmData = null;
            let confirmSwitchError = null;
            const maxRetries = 3;
            
            for (let attempt = 0; attempt < maxRetries; attempt++) {
              try {
                const response = await supabase.functions.invoke('manage-subscription', {
                  body: {
                    action: 'switch_to_stripe',
                    subscriptionId: subscription.id,
                    data: { 
                      confirmSwitch: true, 
                      stripeSubscriptionId: data.stripeSubscriptionId 
                    }
                  }
                });
                
                if (!response.error && !response.data?.error) {
                  confirmData = response.data;
                  confirmSwitchError = null;
                  break;
                }
                
                confirmSwitchError = response.error || new Error(response.data?.error);
                console.warn(`[UserSubscriptions] Confirm switch attempt ${attempt + 1} failed:`, confirmSwitchError);
                
                if (attempt < maxRetries - 1) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                }
              } catch (err) {
                confirmSwitchError = err;
                if (attempt < maxRetries - 1) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                }
              }
            }
            
            if (confirmSwitchError) {
              console.error('[UserSubscriptions] Confirm switch failed after retries:', confirmSwitchError);
              // Payment succeeded, but confirmation failed - show softer error
              toast.warning('Card verified! Please refresh if your subscription doesn\'t update.');
              onSuccess();
              return;
            }
            
            toast.success('Payment method switched to card successfully!');
          } else if (paymentIntent?.status === 'requires_action') {
            // Shouldn't happen after confirmCardPayment, but handle it
            throw new Error('Additional authentication required. Please try again.');
          } else {
            throw new Error(`Payment not completed: ${paymentIntent?.status}`);
          }
        } else if (data?.switched) {
          // No 3DS needed, switch completed immediately (e.g., during trial)
          const statusMsg = data.status === 'trialing' 
            ? 'Payment method switched to card. Your trial continues and PayPal subscription has been cancelled.'
            : 'Payment method switched to card. Your PayPal subscription has been cancelled.';
          toast.success(statusMsg);
        }
      } else {
        // Just update the Stripe payment method
        const { data, error: updateError } = await supabase.functions.invoke('manage-subscription', {
          body: {
            action: 'update_payment_method',
            subscriptionId: subscription.id,
            data: { paymentMethodId: paymentMethod.id }
          }
        });

        if (updateError) throw updateError;
        if (data?.error) throw new Error(data.error);

        toast.success('Payment method updated successfully');
      }
      
      onSuccess();
    } catch (err: any) {
      console.error('Update payment error:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to update payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isPayPalSubscription && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md text-sm text-amber-800 dark:text-amber-200">
          <strong>Note:</strong> Switching from PayPal to card will cancel your PayPal subscription and create a new subscription charged to this card.
        </div>
      )}
      <div className="space-y-2">
        <Label>Card details</Label>
        <div className="flex rounded-md border border-input bg-white overflow-hidden">
          <div className="flex-1 min-h-[44px] px-3 py-3 border-r border-input">
            <CardNumberElement options={{ style: CARD_ELEMENT_STYLE }} />
          </div>
          <div className="w-24 min-h-[44px] px-3 py-3 border-r border-input">
            <CardExpiryElement options={{ style: CARD_ELEMENT_STYLE }} />
          </div>
          <div className="w-16 min-h-[44px] px-3 py-3">
            <CardCvcElement options={{ style: CARD_ELEMENT_STYLE }} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button type="submit" disabled={isProcessing || !stripe}>
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {isPayPalSubscription ? 'Switching...' : 'Updating...'}
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              {isPayPalSubscription ? 'Switch to Card' : 'Update Card'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function UserSubscriptions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [isSwitchingToPaypal, setIsSwitchingToPaypal] = useState(false);

  // Fetch Stripe publishable key
  const { data: stripeKeyData } = useQuery({
    queryKey: ['stripe-key'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-stripe-publishable-key');
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });

  // Initialize Stripe
  useEffect(() => {
    if (stripeKeyData?.publishableKey) {
      setStripePromise(loadStripe(stripeKeyData.publishableKey));
    }
  }, [stripeKeyData?.publishableKey]);

  // Handle PayPal switch return
  useEffect(() => {
    const paypalSwitch = searchParams.get('paypal_switch');
    const subId = searchParams.get('sub_id');
    
    if (paypalSwitch === 'success' && subId) {
      // Confirm the switch
      const confirmSwitch = async () => {
        try {
          toast.info('Confirming payment method switch...');
          const { data, error } = await supabase.functions.invoke('manage-subscription', {
            body: {
              action: 'confirm_paypal_switch',
              subscriptionId: subId,
            }
          });
          
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          
          if (data?.switched) {
            toast.success('Payment method switched to PayPal successfully!');
            queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
          } else if (data?.requiresApproval) {
            toast.error('Please complete the PayPal approval first');
            if (data.approveUrl) {
              window.open(data.approveUrl, '_blank');
            }
          }
        } catch (err: any) {
          console.error('PayPal switch confirmation error:', err);
          toast.error(err.message || 'Failed to confirm payment method switch');
        }
        
        // Clear URL params
        searchParams.delete('paypal_switch');
        searchParams.delete('sub_id');
        setSearchParams(searchParams);
      };
      
      confirmSwitch();
    } else if (paypalSwitch === 'cancelled') {
      toast.info('PayPal switch was cancelled');
      searchParams.delete('paypal_switch');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, queryClient]);

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

  const openPaymentDialog = (sub: any) => {
    setSelectedSubscription(sub);
    // Default to showing card option (for switching from PayPal or updating card)
    setPaymentMethod('stripe');
    setPaymentDialogOpen(true);
  };

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
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">
                            {sub.products?.name || sub.product_name || 'Subscription'}
                          </h4>
                          {getStatusBadge(sub.status)}
                          {/* Payment Provider Badge */}
                          <Badge 
                            variant="outline" 
                            className={
                              sub.payment_provider === 'stripe' 
                                ? 'text-purple-600 border-purple-300 bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:bg-purple-950/30'
                                : sub.payment_provider === 'paypal'
                                ? 'text-blue-600 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950/30'
                                : ''
                            }
                          >
                            {sub.payment_provider === 'stripe' ? (
                              <>
                                <CreditCard className="h-3 w-3 mr-1" />
                                Card
                              </>
                            ) : sub.payment_provider === 'paypal' ? (
                              <>
                                <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.644h6.756c2.332 0 4.018.603 5.018 1.794.466.556.78 1.186.945 1.87.167.692.188 1.518.062 2.455l-.013.088v.612l.478.244c.411.21.736.451.979.724.306.345.514.77.623 1.265.112.505.13 1.104.053 1.786-.09.794-.275 1.487-.551 2.06-.26.537-.603.984-1.019 1.326-.399.328-.88.577-1.43.738a6.906 6.906 0 0 1-1.874.248H14.69a.95.95 0 0 0-.938.802l-.038.217-.64 4.063-.03.155a.95.95 0 0 1-.938.802H7.076z"/>
                                </svg>
                                PayPal
                              </>
                            ) : (
                              sub.payment_provider || 'Unknown'
                            )}
                          </Badge>
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

                        {/* Update Payment Method button - for active/past_due subscriptions */}
                        {(sub.status === 'active' || sub.status === 'past_due') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPaymentDialog(sub)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Update Payment Method
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

      {/* Update Payment Method Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Payment Method</DialogTitle>
            <DialogDescription>
              Choose how you'd like to pay for your subscription going forward.
            </DialogDescription>
          </DialogHeader>

          {selectedSubscription && (
            <div className="space-y-4 py-2">
              {/* Payment method selector */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={paymentMethod === 'stripe' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setPaymentMethod('stripe')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Card
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'paypal' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setPaymentMethod('paypal')}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.644h6.756c2.332 0 4.018.603 5.018 1.794.466.556.78 1.186.945 1.87.167.692.188 1.518.062 2.455l-.013.088v.612l.478.244c.411.21.736.451.979.724.306.345.514.77.623 1.265.112.505.13 1.104.053 1.786-.09.794-.275 1.487-.551 2.06-.26.537-.603.984-1.019 1.326-.399.328-.88.577-1.43.738a6.906 6.906 0 0 1-1.874.248H14.69a.95.95 0 0 0-.938.802l-.038.217-.64 4.063-.03.155a.95.95 0 0 1-.938.802H7.076z"/>
                  </svg>
                  PayPal
                </Button>
              </div>

              {/* Stripe card form */}
              {paymentMethod === 'stripe' && stripeKeyData?.publishableKey && (
                <Elements stripe={loadStripe(stripeKeyData.publishableKey)}>
                  <UpdatePaymentForm
                    subscription={selectedSubscription}
                    onSuccess={() => {
                      setPaymentDialogOpen(false);
                      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
                    }}
                    onCancel={() => setPaymentDialogOpen(false)}
                  />
                </Elements>
              )}

              {/* PayPal option */}
              {paymentMethod === 'paypal' && (
                <div className="space-y-4">
                  {selectedSubscription?.payment_provider === 'stripe' ? (
                    // Switching from Stripe to PayPal
                    <>
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md text-sm text-amber-800 dark:text-amber-200">
                        <strong>Note:</strong> Switching to PayPal will cancel your card subscription and create a new PayPal subscription. You'll be redirected to PayPal to authorize the new payment method.
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          disabled={isSwitchingToPaypal}
                          onClick={async () => {
                            setIsSwitchingToPaypal(true);
                            try {
                              const { data, error } = await supabase.functions.invoke('manage-subscription', {
                                body: {
                                  action: 'switch_to_paypal',
                                  subscriptionId: selectedSubscription.id,
                                  data: { returnUrl: window.location.origin }
                                }
                              });
                              
                              if (error) throw error;
                              if (data?.error) throw new Error(data.error);
                              
                              if (data?.approveUrl) {
                                toast.info('Redirecting to PayPal for authorization...');
                                setPaymentDialogOpen(false);
                                window.location.href = data.approveUrl;
                              } else {
                                throw new Error('No PayPal approval URL received');
                              }
                            } catch (err: any) {
                              console.error('Switch to PayPal error:', err);
                              toast.error(err.message || 'Failed to switch to PayPal');
                            } finally {
                              setIsSwitchingToPaypal(false);
                            }
                          }}
                        >
                          {isSwitchingToPaypal ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Preparing...
                            </>
                          ) : (
                            <>
                              <ArrowRightLeft className="h-4 w-4 mr-2" />
                              Switch to PayPal
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    // Already on PayPal - update payment method
                    <>
                      <p className="text-sm text-muted-foreground">
                        To update your PayPal payment method, you'll need to manage it through your PayPal account. Click below to open PayPal in a new window.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => {
                            const paypalSubId = selectedSubscription?.provider_subscription_id;
                            if (paypalSubId) {
                              window.open(`https://www.paypal.com/myaccount/autopay/connect/${paypalSubId}`, '_blank', 'width=600,height=700');
                              toast.info('PayPal opened in a new window. Update your payment method there.');
                              setPaymentDialogOpen(false);
                            } else {
                              toast.error('Unable to find PayPal subscription details');
                            }
                          }}
                        >
                          Open PayPal Settings
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
