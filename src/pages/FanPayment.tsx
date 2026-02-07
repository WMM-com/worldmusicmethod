import { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, Plus, Minus, Trash2, CreditCard, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CartItem {
  product_id: string;
  variant_id?: string;
  title: string;
  unit_price: number;
  quantity: number;
}

export default function FanPayment() {
  const { gigId } = useParams<{ gigId: string }>();
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const cancelled = searchParams.get('cancelled') === 'true';

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customAmount, setCustomAmount] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  // Fetch gig details (public read via RLS)
  const { data: gig, isLoading: gigLoading } = useQuery({
    queryKey: ['fan-gig', gigId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merch_gigs')
        .select('*')
        .eq('id', gigId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!gigId,
  });

  // Fetch artist's active products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['fan-products', gig?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merch_products')
        .select('*')
        .eq('user_id', gig!.user_id)
        .eq('is_active', true)
        .order('title');
      if (error) throw error;
      return data;
    },
    enabled: !!gig?.user_id,
  });

  const currency = gig?.currency || 'USD';

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  }, [cart]);

  const customAmountNum = parseFloat(customAmount) || 0;
  const grandTotal = cartTotal + customAmountNum;

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        product_id: product.id,
        title: product.title,
        unit_price: Number(product.base_price),
        quantity: 1,
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => i.product_id === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  };

  const handleCheckout = async () => {
    if (grandTotal <= 0) {
      toast.error('Add items or enter a custom amount');
      return;
    }

    setCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-merch-checkout', {
        body: {
          gig_id: gigId,
          items: cart.length > 0 ? cart : undefined,
          custom_amount: customAmountNum > 0 ? customAmountNum : undefined,
          buyer_email: buyerEmail || undefined,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setCheckingOut(false);
    }
  };

  // Success / cancelled states
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">Payment Successful!</h1>
            <p className="text-muted-foreground">Thank you for your purchase. The artist has been notified.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">Payment Cancelled</h1>
            <p className="text-muted-foreground">No charge was made. You can try again below.</p>
            <Button onClick={() => window.location.href = `/pay/${gigId}`} className="mt-2">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gigLoading || productsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-6">
            <h1 className="text-xl font-bold">Gig not found</h1>
            <p className="text-muted-foreground mt-2">This payment link may have expired or is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="bg-card border-b px-4 py-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{gig.name}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(new Date(gig.gig_date), 'EEEE, d MMMM yyyy')}
          {gig.venue && ` · ${gig.venue}`}
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Products */}
        {products.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Products</h2>
            {products.map(product => {
              const cartItem = cart.find(i => i.product_id === product.id);
              return (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="h-16 w-16 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.title}</p>
                      <p className="text-sm font-semibold text-primary">
                        {formatCurrency(Number(product.base_price), currency)}
                      </p>
                    </div>
                    {cartItem ? (
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(product.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{cartItem.quantity}</span>
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(product.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => addToCart(product)}>
                        Add
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Pay */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick Pay</h2>
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Enter a custom amount for donations or unlisted items.</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">{currency}</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  className="text-lg"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email (optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Email (optional, for receipt)</label>
          <Input
            type="email"
            placeholder="your@email.com"
            value={buyerEmail}
            onChange={e => setBuyerEmail(e.target.value)}
          />
        </div>
      </div>

      {/* Sticky bottom bar */}
      {grandTotal > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 z-50">
          <div className="max-w-lg mx-auto space-y-3">
            {/* Cart summary */}
            {cart.length > 0 && (
              <div className="space-y-1">
                {cart.map(item => (
                  <div key={item.product_id} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{item.title} × {item.quantity}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span>{formatCurrency(item.unit_price * item.quantity, currency)}</span>
                      <button onClick={() => removeFromCart(item.product_id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {customAmountNum > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Custom amount</span>
                    <span>{formatCurrency(customAmountNum, currency)}</span>
                  </div>
                )}
                <Separator className="my-1" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{formatCurrency(grandTotal, currency)}</p>
              </div>
              <Button size="lg" onClick={handleCheckout} disabled={checkingOut} className="min-w-[140px]">
                {checkingOut ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="h-4 w-4 mr-2" /> Pay Now</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
