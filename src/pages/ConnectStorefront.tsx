/**
 * ConnectStorefront
 * 
 * Public storefront page for a specific connected account.
 * Displays their products and allows customers to purchase via Stripe Checkout.
 *
 * Route: /store/:accountId
 * 
 * NOTE: In production, you should use a username or slug instead of the
 * Stripe account ID in the URL. Map the public identifier to the account ID
 * on the server side for security.
 */
import { useParams } from 'react-router-dom';
import { useStorefrontProducts, useConnectCheckout } from '@/hooks/useStripeConnectV2';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingBag, Store } from 'lucide-react';

export default function ConnectStorefront() {
  // The accountId comes from the URL parameter
  // TODO: In production, use a username/slug and resolve to accountId server-side
  const { accountId } = useParams<{ accountId: string }>();
  const { data, isLoading, error } = useStorefrontProducts(accountId);
  const checkout = useConnectCheckout();

  /**
   * Handles the "Buy Now" button click.
   * Creates a Stripe Checkout session as a direct charge on the connected account.
   */
  const handleBuy = (product: any) => {
    if (!accountId) return;

    const price = product.default_price;
    if (price?.id) {
      // Use the existing price ID for the checkout
      checkout.mutate({
        accountId,
        priceId: price.id,
        quantity: 1,
      });
    } else {
      // Fallback: create inline price_data
      checkout.mutate({
        accountId,
        productName: product.name,
        unitAmount: price?.unit_amount || 0,
        currency: price?.currency || 'usd',
        quantity: 1,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Store Not Found</h2>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const products = data?.products || [];
  const storeName = data?.storeName || 'Store';

  return (
    <div className="min-h-screen bg-background">
      {/* Store Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3">
            <Store className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{storeName}</h1>
              <p className="text-muted-foreground text-sm">
                {products.length} product{products.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Products Grid */}
      <main className="container mx-auto px-4 py-8">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Products Yet</h2>
            <p className="text-muted-foreground">This store hasn't added any products.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product: any) => {
              const price = product.default_price;
              const amount = price?.unit_amount ? (price.unit_amount / 100).toFixed(2) : '0.00';
              const currency = (price?.currency || 'usd').toUpperCase();

              return (
                <Card key={product.id} className="flex flex-col">
                  {/* Product Image */}
                  {product.images?.[0] && (
                    <div className="aspect-square overflow-hidden rounded-t-lg">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                  </CardHeader>

                  <CardContent className="flex-1">
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {product.description}
                      </p>
                    )}
                  </CardContent>

                  <CardFooter className="flex items-center justify-between pt-0">
                    <Badge variant="secondary" className="text-base font-semibold">
                      {currency} {amount}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => handleBuy(product)}
                      disabled={checkout.isPending}
                    >
                      {checkout.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Buy Now'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
