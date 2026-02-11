/**
 * ConnectDashboard
 * 
 * Dashboard component for managing a user's Stripe Connect V2 integration.
 * Displays:
 * 1. Account creation / onboarding status
 * 2. Product management (create & list)
 * 3. Platform subscription management
 * 4. Storefront link
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  useCreateConnectAccount,
  useStartOnboarding,
  useConnectAccountStatus,
  useConnectProducts,
  useCreateConnectProduct,
  useConnectSubscription,
  useConnectBillingPortal,
} from '@/hooks/useStripeConnectV2';
import {
  Store,
  Check,
  Loader2,
  ExternalLink,
  Plus,
  AlertCircle,
  CreditCard,
  Package,
  Crown,
  Link as LinkIcon,
} from 'lucide-react';

export function ConnectDashboard() {
  const { isAdmin } = useAuth();
  const { data: status, isLoading: statusLoading } = useConnectAccountStatus();
  const createAccount = useCreateConnectAccount();
  const startOnboarding = useStartOnboarding();
  const { data: products, isLoading: productsLoading } = useConnectProducts(!!status?.hasAccount && !!status?.readyToProcessPayments);
  const createProduct = useCreateConnectProduct();
  const startSubscription = useConnectSubscription();
  const openPortal = useConnectBillingPortal();

  // Product creation form state
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'usd',
  });

  // Account creation form state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    display_name: '',
    contact_email: '',
  });

  const handleCreateAccount = async () => {
    await createAccount.mutateAsync(accountForm);
    setCreateDialogOpen(false);
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    await createProduct.mutateAsync({
      name: newProduct.name,
      description: newProduct.description,
      priceInCents: Math.round(parseFloat(newProduct.price) * 100),
      currency: newProduct.currency,
    });
    setProductDialogOpen(false);
    setNewProduct({ name: '', description: '', price: '', currency: 'usd' });
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Section 1: Account & Onboarding Status ─────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Connect
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to accept payments and sell products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status?.hasAccount ? (
            // No account yet — show creation button
            <div className="text-center py-4">
              <Store className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Create a Stripe Connected Account to start accepting payments
              </p>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Stripe Connected Account</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Display Name</Label>
                      <Input
                        value={accountForm.display_name}
                        onChange={(e) => setAccountForm(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="Your store or business name"
                      />
                    </div>
                    <div>
                      <Label>Contact Email</Label>
                      <Input
                        type="email"
                        value={accountForm.contact_email}
                        onChange={(e) => setAccountForm(prev => ({ ...prev, contact_email: e.target.value }))}
                        placeholder="your@email.com"
                      />
                    </div>
                    <Button
                      onClick={handleCreateAccount}
                      disabled={createAccount.isPending}
                      className="w-full"
                    >
                      {createAccount.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            // Account exists — show status
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{status.displayName || 'Your Account'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{status.accountId}</p>
                </div>
                <div className="flex items-center gap-2">
                  {status.readyToProcessPayments ? (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      <Check className="h-3 w-3 mr-1" /> Active
                    </Badge>
                  ) : status.onboardingComplete ? (
                    <Badge variant="secondary" className="bg-accent text-accent-foreground">
                      <AlertCircle className="h-3 w-3 mr-1" /> Pending Verification
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <AlertCircle className="h-3 w-3 mr-1" /> Onboarding Required
                    </Badge>
                  )}
                </div>
              </div>

              {/* Onboarding button (if not yet complete) */}
              {!status.onboardingComplete && (
                <Button
                  onClick={() => startOnboarding.mutate()}
                  disabled={startOnboarding.isPending}
                  className="w-full"
                >
                  {startOnboarding.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Onboard to Collect Payments
                </Button>
              )}

              {/* Storefront link */}
              {status.readyToProcessPayments && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Your storefront:</span>
                  <a
                    href={`/store/${status.accountId}`}
                    target="_blank"
                    rel="noopener"
                    className="text-sm text-primary hover:underline"
                  >
                    /store/{status.accountId}
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 2: Products ────────────────────────────────────── */}
      {status?.hasAccount && status?.readyToProcessPayments && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products
                </CardTitle>
                <CardDescription>
                  Products on your connected account storefront
                </CardDescription>
              </div>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Product</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Product Name</Label>
                      <Input
                        value={newProduct.name}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Beat Pack Vol. 1"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={newProduct.description}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="High quality beats"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Price (USD)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.50"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="9.99"
                        />
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <Input
                          value={newProduct.currency}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, currency: e.target.value }))}
                          placeholder="usd"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleCreateProduct}
                      disabled={createProduct.isPending}
                      className="w-full"
                    >
                      {createProduct.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Create Product'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !products?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No products yet. Create your first product to start selling.
              </p>
            ) : (
              <div className="space-y-2">
                {products.map((product: any) => {
                  const price = product.default_price;
                  const amount = price?.unit_amount ? (price.unit_amount / 100).toFixed(2) : '—';
                  const currency = (price?.currency || 'usd').toUpperCase();

                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground">{product.description}</p>
                        )}
                      </div>
                      <Badge variant="outline">{currency} {amount}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Section 3: Platform Subscription (Admin only) ──────────────────────── */}
      {status?.hasAccount && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Platform Subscription
            </CardTitle>
            <CardDescription>
              Subscribe to premium platform features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* PLACEHOLDER: Replace with your actual subscription price ID */}
            <p className="text-sm text-muted-foreground">
              Upgrade your account to access premium features like advanced analytics,
              custom branding, and priority support.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => startSubscription.mutate(undefined)}
                disabled={startSubscription.isPending}
              >
                {startSubscription.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Crown className="h-4 w-4 mr-2" />
                )}
                Subscribe
              </Button>
              <Button
                variant="ghost"
                onClick={() => openPortal.mutate()}
                disabled={openPortal.isPending}
              >
                {openPortal.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Manage Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
