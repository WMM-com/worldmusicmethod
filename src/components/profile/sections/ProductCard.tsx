import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useGeoPricing, formatPrice } from '@/contexts/GeoPricingContext';
import { DigitalProduct } from '@/hooks/useDigitalProducts';
import { FileIcon, Download, ShoppingCart, Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProductCardProps {
  product: DigitalProduct;
  onPurchase?: (product: DigitalProduct, amount: number) => void;
  isPurchasing?: boolean;
}

export function ProductCard({ product, onPurchase, isPurchasing }: ProductCardProps) {
  const { calculatePrice, isLoading: geoLoading } = useGeoPricing();
  const [customAmount, setCustomAmount] = useState<string>('');
  
  // Calculate geo-adjusted price
  const geoPrice = calculatePrice(product.base_price, product.geo_pricing ? 
    Object.entries(product.geo_pricing).map(([region, data]: [string, any]) => ({
      region,
      discount_percentage: data.discount_percentage || 0,
      currency: data.currency || product.currency,
      fixed_price: data.fixed_price,
    })) : undefined
  );
  
  const displayPrice = geoPrice?.price ?? product.base_price;
  const displayCurrency = geoPrice?.currency ?? product.currency;
  const minPrice = product.min_price ?? 0;
  
  // For PWYW, default to suggested price
  const suggestedPrice = displayPrice;
  const currentAmount = customAmount ? parseFloat(customAmount) : suggestedPrice;
  
  const handlePurchase = () => {
    if (product.price_type === 'pwyw') {
      if (currentAmount < minPrice) {
        toast.error(`Minimum price is ${formatPrice(minPrice, displayCurrency, false)}`);
        return;
      }
    }
    onPurchase?.(product, currentAmount);
  };

  const getFileExtension = (url: string) => {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1].toUpperCase() : 'FILE';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        {/* File Type Badge */}
        <div className="flex items-start gap-3 mb-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <FileIcon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{product.title}</h3>
            <Badge variant="secondary" className="text-xs mt-1">
              {getFileExtension(product.file_url)}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Pricing */}
        <div className="mb-4">
          {product.price_type === 'fixed' ? (
            <div className="flex items-baseline gap-2">
              {geoLoading ? (
                <span className="text-lg font-bold">...</span>
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(displayPrice, displayCurrency, false)}
                </span>
              )}
              {geoPrice && geoPrice.discount_percentage > 0 && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.base_price, product.currency, false)}
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Pay What You Want
                </Badge>
                {minPrice > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Min: {formatPrice(minPrice, displayCurrency, false)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {displayCurrency}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min={minPrice}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={suggestedPrice.toString()}
                  className="h-9 w-24"
                />
                <span className="text-xs text-muted-foreground">
                  Suggested: {formatPrice(suggestedPrice, displayCurrency, false)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            className="flex-1" 
            onClick={handlePurchase}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4 mr-2" />
            )}
            {product.price_type === 'pwyw' && currentAmount === 0 
              ? 'Get Free' 
              : 'Buy Now'}
          </Button>
          <Button variant="outline" size="icon">
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
