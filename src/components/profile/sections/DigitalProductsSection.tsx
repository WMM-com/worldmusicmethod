import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useDigitalProducts, useDeleteDigitalProduct, DigitalProduct } from '@/hooks/useDigitalProducts';
import { ProductUpload } from './ProductUpload';
import { ProductCard } from './ProductCard';
import { BuyProductModal } from './BuyProductModal';
import { ProfileSection } from '@/hooks/useProfilePortfolio';
import { Plus, ShoppingBag, Trash2, Settings, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DigitalProductsSectionProps {
  section: ProfileSection;
  isEditing: boolean;
  userId: string;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

export function DigitalProductsSection({ 
  section, 
  isEditing, 
  userId,
  onUpdate, 
  onDelete 
}: DigitalProductsSectionProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DigitalProduct | null>(null);
  const { data: products, isLoading } = useDigitalProducts(userId);
  const deleteProduct = useDeleteDigitalProduct();

  const handlePurchase = (product: DigitalProduct) => {
    setSelectedProduct(product);
    setBuyModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct.mutateAsync(productId);
      toast.success('Product deleted');
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  return (
    <Card className="relative">
      {isEditing && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          {section.title || 'Digital Products'}
        </CardTitle>
        
        {isEditing && (
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <ProductUpload 
                onSuccess={() => setUploadOpen(false)}
                onCancel={() => setUploadOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="relative">
                {isEditing && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 z-10"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                <ProductCard 
                  product={product} 
                  onPurchase={() => handlePurchase(product)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No digital products yet</p>
            {isEditing && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setUploadOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Product
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Buy Product Modal */}
      {selectedProduct && (
        <BuyProductModal
          open={buyModalOpen}
          onClose={() => {
            setBuyModalOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          sellerId={userId}
        />
      )}
    </Card>
  );
}
