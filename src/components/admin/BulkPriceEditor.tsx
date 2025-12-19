import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Percent, DollarSign } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  base_price_usd: number;
}

interface BulkPriceEditorProps {
  products: Product[];
  trigger: React.ReactNode;
}

export function BulkPriceEditor({ products, trigger }: BulkPriceEditorProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [adjustmentType, setAdjustmentType] = useState<'percentage' | 'fixed'>('percentage');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'increase' | 'decrease'>('increase');

  const bulkUpdateMutation = useMutation({
    mutationFn: async () => {
      const value = parseFloat(adjustmentValue);
      if (isNaN(value) || value <= 0) throw new Error('Invalid adjustment value');

      const updates = selectedProducts.map(productId => {
        const product = products.find(p => p.id === productId);
        if (!product) return null;

        let newPrice: number;
        if (adjustmentType === 'percentage') {
          const multiplier = adjustmentDirection === 'increase' 
            ? 1 + (value / 100)
            : 1 - (value / 100);
          newPrice = Math.max(0, product.base_price_usd * multiplier);
        } else {
          newPrice = adjustmentDirection === 'increase'
            ? product.base_price_usd + value
            : Math.max(0, product.base_price_usd - value);
        }

        return {
          id: productId,
          base_price_usd: Math.round(newPrice * 100) / 100,
        };
      }).filter(Boolean);

      for (const update of updates) {
        if (update) {
          const { error } = await supabase
            .from('products')
            .update({ base_price_usd: update.base_price_usd })
            .eq('id', update.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(`Updated ${selectedProducts.length} products`);
      setOpen(false);
      setSelectedProducts([]);
      setAdjustmentValue('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update products');
    },
  });

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const previewPrice = (product: Product) => {
    const value = parseFloat(adjustmentValue);
    if (isNaN(value) || value <= 0) return product.base_price_usd;

    if (adjustmentType === 'percentage') {
      const multiplier = adjustmentDirection === 'increase'
        ? 1 + (value / 100)
        : 1 - (value / 100);
      return Math.max(0, product.base_price_usd * multiplier);
    } else {
      return adjustmentDirection === 'increase'
        ? product.base_price_usd + value
        : Math.max(0, product.base_price_usd - value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Price Editor</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Adjustment Controls */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg border bg-accent/5">
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select value={adjustmentType} onValueChange={(v: any) => setAdjustmentType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" /> Percentage
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Fixed Amount
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={adjustmentDirection} onValueChange={(v: any) => setAdjustmentDirection(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase</SelectItem>
                  <SelectItem value="decrease">Decrease</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Value</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step={adjustmentType === 'percentage' ? '1' : '0.01'}
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(e.target.value)}
                  placeholder={adjustmentType === 'percentage' ? '10' : '5.00'}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {adjustmentType === 'percentage' ? '%' : '$'}
                </span>
              </div>
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Products ({selectedProducts.length} selected)</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedProducts.length === products.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
              {products.map((product) => {
                const isSelected = selectedProducts.includes(product.id);
                const newPrice = previewPrice(product);
                const hasChange = adjustmentValue && newPrice !== product.base_price_usd;
                
                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10' : 'hover:bg-accent/10'
                    }`}
                    onClick={() => toggleProduct(product.id)}
                  >
                    <Checkbox checked={isSelected} />
                    <span className="flex-1 font-medium">{product.name}</span>
                    <div className="text-sm text-right">
                      <span className={hasChange && isSelected ? 'line-through text-muted-foreground' : ''}>
                        ${product.base_price_usd.toFixed(2)}
                      </span>
                      {hasChange && isSelected && (
                        <span className={`ml-2 font-semibold ${
                          adjustmentDirection === 'increase' ? 'text-destructive' : 'text-green-600'
                        }`}>
                          ${newPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => bulkUpdateMutation.mutate()}
              disabled={selectedProducts.length === 0 || !adjustmentValue || bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending
                ? 'Updating...'
                : `Update ${selectedProducts.length} Products`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
