import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  base_price_usd: number;
  sale_price_usd: number | null;
  sale_ends_at: string | null;
  product_type: string;
  course_id: string | null;
  is_active: boolean;
  purchase_tag_id: string | null;
  refund_remove_tag: boolean | null;
}

interface EmailTag {
  id: string;
  name: string;
}

interface ProductEditDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REGIONS = [
  { value: 'africa', label: 'Africa', defaultDiscount: 65 },
  { value: 'south_america', label: 'South America', defaultDiscount: 65 },
  { value: 'usa_canada', label: 'USA & Canada', defaultDiscount: 0 },
  { value: 'uk', label: 'UK', defaultDiscount: 0 },
  { value: 'north_west_europe', label: 'North West Europe', defaultDiscount: 0 },
  { value: 'east_south_europe', label: 'East & South Europe', defaultDiscount: 40 },
  { value: 'asia_lower', label: 'Asia (Lower Income)', defaultDiscount: 65 },
  { value: 'asia_higher', label: 'Asia (Higher Income)', defaultDiscount: 0 },
];

export function ProductEditDialog({ product, open, onOpenChange }: ProductEditDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [saleEndsAt, setSaleEndsAt] = useState('');
  const [hasSale, setHasSale] = useState(false);
  const [productType, setProductType] = useState('course');
  const [courseId, setCourseId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [regionalPrices, setRegionalPrices] = useState<Record<string, number>>({});
  const [purchaseTagId, setPurchaseTagId] = useState('');
  const [refundRemoveTag, setRefundRemoveTag] = useState(true);

  const { data: courses } = useQuery({
    queryKey: ['admin-courses-for-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('id, title');
      if (error) throw error;
      return data;
    },
  });

  const { data: tags } = useQuery({
    queryKey: ['admin-email-tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_tags').select('id, name').order('name');
      if (error) throw error;
      return data as EmailTag[];
    },
  });

  const { data: existingRegionalPricing } = useQuery({
    queryKey: ['product-regional-pricing', product?.id],
    queryFn: async () => {
      if (!product) return [];
      const { data, error } = await supabase
        .from('product_regional_pricing')
        .select('*')
        .eq('product_id', product.id);
      if (error) throw error;
      return data;
    },
    enabled: !!product,
  });

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setBasePrice(product.base_price_usd.toString());
      setSalePrice(product.sale_price_usd?.toString() || '');
      setSaleEndsAt(product.sale_ends_at ? new Date(product.sale_ends_at).toISOString().slice(0, 16) : '');
      setHasSale(!!product.sale_price_usd);
      setProductType(product.product_type);
      setCourseId(product.course_id || '');
      setIsActive(product.is_active);
      setPurchaseTagId(product.purchase_tag_id || '');
      setRefundRemoveTag(product.refund_remove_tag ?? true);
    }
  }, [product]);

  useEffect(() => {
    if (existingRegionalPricing) {
      const prices: Record<string, number> = {};
      existingRegionalPricing.forEach(p => {
        prices[p.region] = p.discount_percentage;
      });
      setRegionalPrices(prices);
    }
  }, [existingRegionalPricing]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!product) return;
      
      const { error } = await supabase
        .from('products')
        .update({
          name,
          description: description || null,
          base_price_usd: parseFloat(basePrice) || 0,
          sale_price_usd: hasSale ? (parseFloat(salePrice) || null) : null,
          sale_ends_at: hasSale && saleEndsAt ? new Date(saleEndsAt).toISOString() : null,
          product_type: productType,
          course_id: courseId || null,
          is_active: isActive,
          purchase_tag_id: purchaseTagId || null,
          refund_remove_tag: refundRemoveTag,
        })
        .eq('id', product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product updated');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update product');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!product) return;
      const { error } = await supabase.from('products').delete().eq('id', product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product deleted');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });

  const saveRegionalPricingMutation = useMutation({
    mutationFn: async () => {
      if (!product) return;
      
      await supabase
        .from('product_regional_pricing')
        .delete()
        .eq('product_id', product.id);
      
      const inserts = Object.entries(regionalPrices)
        .filter(([_, discount]) => discount > 0)
        .map(([region, discount]) => ({
          product_id: product.id,
          region: region as any,
          discount_percentage: discount,
          currency: region === 'uk' ? 'GBP' : region.includes('europe') ? 'EUR' : 'USD',
        }));
      
      if (inserts.length > 0) {
        const { error } = await supabase.from('product_regional_pricing').insert(inserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-regional-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['product-regional-pricing'] });
      toast.success('Regional pricing saved');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save regional pricing');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const calculateRegionalPrice = (discount: number) => {
    const base = parseFloat(basePrice) || 0;
    return base * (1 - discount / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="pricing">Regional Pricing</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Base Price (USD)</Label>
                  <Input id="price" type="number" min="0" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Product Type</Label>
                  <Select value={productType} onValueChange={setProductType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="course">Course</SelectItem>
                      <SelectItem value="membership">Membership</SelectItem>
                      <SelectItem value="bundle">Bundle</SelectItem>
                      <SelectItem value="private_lesson">Private Lesson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-lg border bg-accent/5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hasSale" className="font-medium">On Sale</Label>
                  <Switch id="hasSale" checked={hasSale} onCheckedChange={setHasSale} />
                </div>
                
                {hasSale && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salePrice">Sale Price (USD)</Label>
                      <Input id="salePrice" type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Sale price" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="saleEnds">Sale Ends (optional)</Label>
                      <Input id="saleEnds" type="datetime-local" value={saleEndsAt} onChange={(e) => setSaleEndsAt(e.target.value)} />
                    </div>
                  </div>
                )}
                
                {hasSale && salePrice && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="line-through text-muted-foreground">${basePrice}</span>
                    <span className="font-semibold text-primary">${salePrice}</span>
                    <Badge variant="destructive" className="text-xs">
                      {Math.round((1 - parseFloat(salePrice) / parseFloat(basePrice)) * 100)}% OFF
                    </Badge>
                  </div>
                )}
              </div>

              {productType === 'course' && (
                <div className="space-y-2">
                  <Label htmlFor="course">Link to Course</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger><SelectValue placeholder="Select a course (optional)" /></SelectTrigger>
                    <SelectContent>
                      {courses?.map((course) => (
                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
              
              <div className="flex justify-between pt-4">
                <Button type="button" variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
                </div>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="pricing">
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">Set discount percentages for different regions. Base price: ${basePrice || '0'}</p>
              
              <div className="space-y-3">
                {REGIONS.map((region) => (
                  <div key={region.value} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{region.label}</p>
                      <p className="text-sm text-muted-foreground">Final: ${calculateRegionalPrice(regionalPrices[region.value] || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="w-20"
                        value={regionalPrices[region.value] || ''}
                        onChange={(e) => setRegionalPrices({ ...regionalPrices, [region.value]: parseInt(e.target.value) || 0 })}
                        placeholder={region.defaultDiscount.toString()}
                      />
                      <span className="text-sm text-muted-foreground">% off</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button onClick={() => saveRegionalPricingMutation.mutate()} disabled={saveRegionalPricingMutation.isPending} className="w-full">
                {saveRegionalPricingMutation.isPending ? 'Saving...' : 'Save Regional Pricing'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="automation">
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">Automatically assign or remove tags when this product is purchased or refunded.</p>
              
              <div className="space-y-2">
                <Label>Tag to assign on purchase</Label>
                <Select value={purchaseTagId} onValueChange={setPurchaseTagId}>
                  <SelectTrigger><SelectValue placeholder="Select a tag (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No tag</SelectItem>
                    {tags?.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">This tag will be added to the customer when they purchase this product</p>
              </div>

              {purchaseTagId && (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/5">
                  <div>
                    <Label htmlFor="refundRemove" className="font-medium">Remove tag on refund</Label>
                    <p className="text-xs text-muted-foreground mt-1">Automatically remove the tag if the purchase is refunded</p>
                  </div>
                  <Switch id="refundRemove" checked={refundRemoveTag} onCheckedChange={setRefundRemoveTag} />
                </div>
              )}

              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="w-full">
                {updateMutation.isPending ? 'Saving...' : 'Save Automation Settings'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
