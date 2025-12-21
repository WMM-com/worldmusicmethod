import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/hooks/useGeoPricing';

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeFromCart, getTotal, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Your cart is empty</h1>
            <p className="text-muted-foreground">Add some courses to get started!</p>
            <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background py-12">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

            <div className="space-y-4 mb-8">
              {items.map((item) => (
                <Card key={item.productId} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">{item.productType}</p>
                    </div>

                    <p className="font-semibold w-24 text-right">
                      {formatPrice(item.price, item.currency || 'USD')}
                    </p>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.productId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold">{formatPrice(getTotal(), items[0]?.currency || 'USD')}</span>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={clearCart}>
                  Clear Cart
                </Button>
                <Button className="flex-1 gap-2" onClick={() => navigate('/checkout')}>
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
}
