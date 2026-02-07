import { useState } from 'react';
import { Plus, Package, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useMerchProducts, useCreateMerchProduct, useUpdateMerchProduct, useDeleteMerchProduct, type MerchProduct } from '@/hooks/useMerchandise';
import { formatCurrency } from '@/lib/currency';

const CATEGORIES = [
  { value: 'clothing', label: 'Clothing' },
  { value: 'music', label: 'Music (CDs / Vinyl)' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'art', label: 'Art / Prints' },
  { value: 'other', label: 'Other' },
];

const defaultForm = {
  title: '',
  description: '',
  category: 'other',
  image_url: '',
  sku: '',
  base_price: 0,
  currency: 'USD',
  cost_price: 0,
  track_inventory: false,
  stock_quantity: 0,
  weight_grams: 0,
  is_active: true,
};

export function MerchProductsTab() {
  const { data: products = [], isLoading } = useMerchProducts();
  const createProduct = useCreateMerchProduct();
  const updateProduct = useUpdateMerchProduct();
  const deleteProduct = useDeleteMerchProduct();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MerchProduct | null>(null);
  const [form, setForm] = useState(defaultForm);

  const openCreate = () => {
    setEditingProduct(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (p: MerchProduct) => {
    setEditingProduct(p);
    setForm({
      title: p.title,
      description: p.description || '',
      category: p.category,
      image_url: p.image_url || '',
      sku: p.sku || '',
      base_price: p.base_price,
      currency: p.currency,
      cost_price: p.cost_price || 0,
      track_inventory: p.track_inventory,
      stock_quantity: p.stock_quantity,
      weight_grams: p.weight_grams || 0,
      is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      description: form.description || null,
      image_url: form.image_url || null,
      sku: form.sku || null,
      cost_price: form.cost_price || null,
      weight_grams: form.weight_grams || null,
    };

    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...payload });
    } else {
      await createProduct.mutateAsync(payload as any);
    }
    setDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No products yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your first merch product to get started.</p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <Card key={p.id} className="overflow-hidden group">
              <div className="aspect-square bg-muted relative">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                )}
                {!p.is_active && (
                  <span className="absolute top-2 left-2 text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">Inactive</span>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold truncate">{p.title}</h4>
                    <p className="text-sm text-muted-foreground capitalize">{p.category}</p>
                  </div>
                  <p className="font-bold text-secondary shrink-0">{formatCurrency(p.base_price, p.currency)}</p>
                </div>
                {p.track_inventory && (
                  <p className="text-xs text-muted-foreground mt-2">Stock: {p.stock_quantity}</p>
                )}
                <div className="flex gap-1 mt-3">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteProduct.mutate(p.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Band T-Shirt" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Product description..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="TSHIRT-001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price *</Label>
                <Input type="number" min={0} step={0.01} value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'NGN', 'KES', 'ZAR'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Cost Price (optional)</Label>
              <Input type="number" min={0} step={0.01} value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.track_inventory} onCheckedChange={v => setForm(f => ({ ...f, track_inventory: v }))} />
              <Label className="mb-0">Track inventory</Label>
            </div>
            {form.track_inventory && (
              <div>
                <Label>Stock Quantity</Label>
                <Input type="number" min={0} value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: parseInt(e.target.value) || 0 }))} />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label className="mb-0">Active (visible to buyers)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title || createProduct.isPending || updateProduct.isPending}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
