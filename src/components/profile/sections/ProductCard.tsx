import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGeoPricing, formatPrice } from '@/contexts/GeoPricingContext';
import { DigitalProduct } from '@/hooks/useDigitalProducts';
import { FileIcon, ShoppingCart, Loader2 } from 'lucide-react';

interface ProductCardProps {
  product: DigitalProduct;
  onPurchase?: () => void;
  isPurchasing?: boolean;
}

export function ProductCard({ product, onPurchase, isPurchasing }: ProductCardProps) {
  const { calculatePrice, isLoading: geoLoading } = useGeoPricing();
  
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

  const getFileExtension = (url: string) => {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1].toUpperCase() : 'FILE';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Cover Image */}
      {product.cover_image_url && (
        <div className="aspect-video overflow-hidden bg-muted">
          <img
            src={product.cover_image_url}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
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
                <span className="text-2xl font-bold text-yellow-400">
                  {formatPrice(displayPrice, displayCurrency, false)}
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs">
                Pay What You Feel
              </Badge>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-yellow-400">
                  {formatPrice(displayPrice, displayCurrency, false)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button 
          className="w-full" 
          onClick={onPurchase}
          disabled={isPurchasing}
        >
          {isPurchasing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ShoppingCart className="h-4 w-4 mr-2" />
          )}
          {product.price_type === 'pwyw' ? 'Name Your Price' : 'Buy Now'}
        </Button>
      </CardContent>
    </Card>
  );
}
