import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, DollarSign } from 'lucide-react';

export function AdminProducts() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          courses:course_id (title)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: regionalPricing } = useQuery({
    queryKey: ['admin-regional-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_regional_pricing')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  const getRegionalPrices = (productId: string) => {
    return regionalPricing?.filter(p => p.product_id === productId) || [];
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products & Pricing</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Base Price (USD)</TableHead>
              <TableHead>Regional Pricing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No products yet
                </TableCell>
              </TableRow>
            ) : (
              products?.map((product) => {
                const prices = getRegionalPrices(product.id);
                
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Package className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.courses && (
                            <p className="text-sm text-muted-foreground">
                              Course: {(product.courses as any).title}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.product_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {formatPrice(product.base_price_usd)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {prices.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {prices.slice(0, 3).map((p, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {p.region}: -{p.discount_percentage}%
                            </Badge>
                          ))}
                          {prices.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{prices.length - 3} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Default pricing</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? 'default' : 'secondary'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(product.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
