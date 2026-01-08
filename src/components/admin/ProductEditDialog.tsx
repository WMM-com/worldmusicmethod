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
import { Trash2, Plus, X, Settings2, BookOpen, Package, FolderOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';

// Expert names list
const EXPERTS = [
  'Bombino',
  'Camilo Menjura',
  'Camilo, Fernando & Niwel',
  'Cyro Zuzi',
  'Derek Gripper',
  'Edd Bateman',
  'Felix Ngindu',
  'Fernando Perez',
  'Hamsa Mounif',
  'Jeannot Bel',
  'Justin Adams',
  'La Perla',
  'Leo Power',
  'Malick Mbengue',
  'Matar Ndiongue',
  'Niwel Tsumbu',
  'Rafael Valim',
  'Rubén Ramos Medina',
  'Vieux Farka Toure',
];

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
  pwyf_enabled?: boolean | null;
  pwyf_min_price_usd?: number | null;
  pwyf_max_price_usd?: number | null;
  pwyf_suggested_price_usd?: number | null;
}

interface EmailTag {
  id: string;
  name: string;
}

interface ExpertAttribution {
  id?: string;
  expert_name: string;
  attribution_percentage: number;
}

interface ProductEditDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REGIONS = [
  { value: 'africa', label: 'Africa', defaultDiscount: 65, currency: 'USD', symbol: '$' },
  { value: 'african_euros', label: 'Africa (Francophone/Lusophone)', defaultDiscount: 65, currency: 'EUR', symbol: '€' },
  { value: 'south_america', label: 'South America', defaultDiscount: 65, currency: 'USD', symbol: '$' },
  { value: 'usa_canada', label: 'USA & Canada', defaultDiscount: 0, currency: 'USD', symbol: '$' },
  { value: 'uk', label: 'UK', defaultDiscount: 20.2, currency: 'GBP', symbol: '£' },
  { value: 'north_west_europe', label: 'North West Europe', defaultDiscount: 14.14, currency: 'EUR', symbol: '€' },
  { value: 'east_south_europe', label: 'East & South Europe', defaultDiscount: 30.3, currency: 'EUR', symbol: '€' },
  { value: 'asia_lower', label: 'Asia (Lower Income)', defaultDiscount: 65, currency: 'USD', symbol: '$' },
  { value: 'asia_higher', label: 'Asia (Higher Income)', defaultDiscount: 0, currency: 'USD', symbol: '$' },
];

// Automation Tags Editor Component
interface ProductTag {
  id: string;
  tag_id: string;
  remove_on_refund: boolean;
  tag_name?: string;
}

function AutomationTagsEditor({ productId, tags }: { productId: string; tags: EmailTag[] }) {
  const queryClient = useQueryClient();
  const [selectedTagId, setSelectedTagId] = useState<string>('');

  const { data: productTags = [], isLoading } = useQuery({
    queryKey: ['product-purchase-tags', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('product_purchase_tags')
        .select('id, tag_id, remove_on_refund')
        .eq('product_id', productId);
      if (error) throw error;
      return data.map(pt => ({
        ...pt,
        tag_name: tags.find(t => t.id === pt.tag_id)?.name || 'Unknown Tag'
      })) as ProductTag[];
    },
    enabled: !!productId,
  });

  const addTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('product_purchase_tags')
        .insert({ product_id: productId, tag_id: tagId, remove_on_refund: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-purchase-tags', productId] });
      setSelectedTagId('');
      toast.success('Tag added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, remove_on_refund }: { id: string; remove_on_refund: boolean }) => {
      const { error } = await supabase
        .from('product_purchase_tags')
        .update({ remove_on_refund })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-purchase-tags', productId] });
      toast.success('Updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeTagMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_purchase_tags')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-purchase-tags', productId] });
      toast.success('Tag removed');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const availableTags = tags.filter(t => !productTags.some(pt => pt.tag_id === t.id));

  if (!productId) {
    return (
      <div className="p-4 rounded-lg border bg-muted/50 text-center">
        <p className="text-sm text-muted-foreground">Save the product first to configure automation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <p className="text-sm text-muted-foreground">
        Assign tags when this product is purchased. Choose which tags should be removed on refund.
      </p>

      {/* Add tag */}
      <div className="flex gap-2">
        <Select value={selectedTagId} onValueChange={setSelectedTagId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a tag to add" />
          </SelectTrigger>
          <SelectContent>
            {availableTags.map(tag => (
              <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => selectedTagId && addTagMutation.mutate(selectedTagId)}
          disabled={!selectedTagId || addTagMutation.isPending}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Tag list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : productTags.length === 0 ? (
        <div className="p-4 rounded-lg border bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">No tags assigned</p>
        </div>
      ) : (
        <div className="space-y-2">
          {productTags.map(pt => (
            <div key={pt.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{pt.tag_name}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`refund-${pt.id}`}
                    checked={pt.remove_on_refund}
                    onCheckedChange={(checked) => updateTagMutation.mutate({ id: pt.id, remove_on_refund: checked })}
                  />
                  <Label htmlFor={`refund-${pt.id}`} className="text-xs text-muted-foreground cursor-pointer">
                    Remove on refund
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTagMutation.mutate(pt.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Inline Subscription Editor Component
interface SubscriptionItem {
  id: string;
  item_type: string;
  item_id: string;
  name?: string;
}

function SubscriptionEditorInline({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [billingInterval, setBillingInterval] = useState<string>('monthly');
  const [trialEnabled, setTrialEnabled] = useState(false);
  const [trialPrice, setTrialPrice] = useState('0');
  const [trialLengthDays, setTrialLengthDays] = useState('7');
  const [selectedItems, setSelectedItems] = useState<SubscriptionItem[]>([]);

  const { data: product } = useQuery({
    queryKey: ['subscription-product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: existingItems } = useQuery({
    queryKey: ['subscription-items', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_items')
        .select('*')
        .eq('subscription_product_id', productId);
      if (error) throw error;
      return data;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ['subscription-courses-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('id, title');
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['subscription-products-list', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .is('billing_interval', null)
        .neq('id', productId);
      if (error) throw error;
      return data;
    },
  });

  const { data: courseGroups } = useQuery({
    queryKey: ['subscription-course-groups-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('course_groups').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (product) {
      setBillingInterval(product.billing_interval || 'monthly');
      setTrialEnabled(product.trial_enabled || false);
      setTrialPrice(product.trial_price_usd?.toString() || '0');
      setTrialLengthDays(product.trial_length_days?.toString() || '7');
    }
  }, [product]);

  useEffect(() => {
    if (existingItems) {
      const mappedItems: SubscriptionItem[] = existingItems.map((item: any) => {
        let name = '';
        if (item.item_type === 'course') {
          name = courses?.find((c) => c.id === item.item_id)?.title || 'Unknown Course';
        } else if (item.item_type === 'product') {
          name = products?.find((p) => p.id === item.item_id)?.name || 'Unknown Product';
        } else if (item.item_type === 'course_group') {
          name = courseGroups?.find((g) => g.id === item.item_id)?.name || 'Unknown Group';
        }
        return { ...item, name };
      });
      setSelectedItems(mappedItems);
    }
  }, [existingItems, courses, products, courseGroups]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error: productError } = await supabase
        .from('products')
        .update({
          billing_interval: billingInterval,
          trial_enabled: trialEnabled,
          trial_price_usd: parseFloat(trialPrice) || 0,
          trial_length_days: parseInt(trialLengthDays) || 0,
        })
        .eq('id', productId);
      if (productError) throw productError;

      await supabase
        .from('subscription_items')
        .delete()
        .eq('subscription_product_id', productId);

      if (selectedItems.length > 0) {
        const inserts = selectedItems.map((item) => ({
          subscription_product_id: productId,
          item_type: item.item_type,
          item_id: item.item_id,
        }));
        const { error: itemsError } = await supabase
          .from('subscription_items')
          .insert(inserts);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-items'] });
      toast.success('Subscription settings saved');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save subscription settings');
    },
  });

  const addItem = (type: string, id: string, name: string) => {
    if (selectedItems.some((item) => item.item_type === type && item.item_id === id)) {
      toast.error('Item already added');
      return;
    }
    setSelectedItems([...selectedItems, { id: `temp-${Date.now()}`, item_type: type, item_id: id, name }]);
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== itemId));
  };

  return (
    <Tabs defaultValue="billing" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="trial">Trial</TabsTrigger>
        <TabsTrigger value="items">Included Items</TabsTrigger>
      </TabsList>

      <TabsContent value="billing" className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>Billing Interval</Label>
          <Select value={billingInterval} onValueChange={setBillingInterval}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Subscribers will be charged{' '}
            <strong>${product?.base_price_usd?.toFixed(2) || '0.00'}</strong>{' '}
            every {billingInterval === 'annual' ? 'year' : billingInterval.replace('ly', '')}.
          </p>
        </Card>
      </TabsContent>

      <TabsContent value="trial" className="space-y-4 pt-4">
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div>
            <Label>Enable Trial Period</Label>
            <p className="text-sm text-muted-foreground">
              Allow users to try before paying full price
            </p>
          </div>
          <Switch checked={trialEnabled} onCheckedChange={setTrialEnabled} />
        </div>

        {trialEnabled && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trial Price (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={trialPrice}
                  onChange={(e) => setTrialPrice(e.target.value)}
                  placeholder="0 for free trial"
                />
                <p className="text-xs text-muted-foreground">
                  Set to 0 for a free trial
                </p>
              </div>
              <div className="space-y-2">
                <Label>Trial Length (Days)</Label>
                <Input
                  type="number"
                  min="1"
                  value={trialLengthDays}
                  onChange={(e) => setTrialLengthDays(e.target.value)}
                />
              </div>
            </div>

            <Card className="p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Users will pay{' '}
                <strong>
                  {parseFloat(trialPrice) === 0
                    ? 'nothing'
                    : `$${parseFloat(trialPrice).toFixed(2)}`}
                </strong>{' '}
                for a {trialLengthDays}-day trial, then{' '}
                <strong>${product?.base_price_usd?.toFixed(2) || '0.00'}</strong>{' '}
                per {billingInterval === 'annual' ? 'year' : billingInterval.replace('ly', '')}.
              </p>
            </Card>
          </>
        )}
      </TabsContent>

      <TabsContent value="items" className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">
          Select which courses, products, or groups are included in this subscription.
        </p>

        <div className="space-y-2">
          <Label>Included Items ({selectedItems.length})</Label>
          {selectedItems.length === 0 ? (
            <Card className="p-4 text-center text-muted-foreground text-sm">
              No items added yet. Add courses, products, or groups below.
            </Card>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg border bg-background"
                >
                  <div className="flex items-center gap-2">
                    {item.item_type === 'course' && <BookOpen className="h-4 w-4 text-primary" />}
                    {item.item_type === 'product' && <Package className="h-4 w-4 text-secondary" />}
                    {item.item_type === 'course_group' && (
                      <FolderOpen className="h-4 w-4 text-accent" />
                    )}
                    <span className="text-sm">{item.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.item_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Add Course</Label>
            <Select onValueChange={(id) => {
              const course = courses?.find((c) => c.id === id);
              if (course) addItem('course', id, course.title);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {courses?.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Add Product</Label>
            <Select onValueChange={(id) => {
              const prod = products?.find((p) => p.id === id);
              if (prod) addItem('product', id, prod.name);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {products?.map((prod) => (
                  <SelectItem key={prod.id} value={prod.id}>
                    {prod.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Add Course Group</Label>
            <Select onValueChange={(id) => {
              const group = courseGroups?.find((g) => g.id === id);
              if (group) addItem('course_group', id, group.name);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {courseGroups?.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      <div className="pt-4">
        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="w-full">
          {updateMutation.isPending ? 'Saving...' : 'Save Subscription Settings'}
        </Button>
      </div>
    </Tabs>
  );
}

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
  const [fixedPrices, setFixedPrices] = useState<Record<string, string>>({});
  const [purchaseTagId, setPurchaseTagId] = useState('');
  const [refundRemoveTag, setRefundRemoveTag] = useState(true);
  const [expertAttributions, setExpertAttributions] = useState<ExpertAttribution[]>([]);
  
  // Pay What You Feel pricing
  const [pwyfEnabled, setPwyfEnabled] = useState(false);
  const [pwyfMinPrice, setPwyfMinPrice] = useState('');
  const [pwyfMaxPrice, setPwyfMaxPrice] = useState('');
  const [pwyfSuggestedPrice, setPwyfSuggestedPrice] = useState('');

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

  const { data: existingAttributions } = useQuery({
    queryKey: ['product-expert-attributions', product?.id],
    queryFn: async () => {
      if (!product) return [];
      const { data, error } = await supabase
        .from('product_expert_attributions')
        .select('*')
        .eq('product_id', product.id);
      if (error) throw error;
      return data as ExpertAttribution[];
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
      
      // Load PWYF settings
      setPwyfEnabled(product.pwyf_enabled || false);
      setPwyfMinPrice(product.pwyf_min_price_usd?.toString() || '');
      setPwyfMaxPrice(product.pwyf_max_price_usd?.toString() || '');
      setPwyfSuggestedPrice(product.pwyf_suggested_price_usd?.toString() || '');
    }
  }, [product]);

  useEffect(() => {
    if (existingRegionalPricing) {
      const discounts: Record<string, number> = {};
      const fixed: Record<string, string> = {};
      existingRegionalPricing.forEach((p: any) => {
        discounts[p.region] = p.discount_percentage;
        if (p.fixed_price !== null && p.fixed_price !== undefined) {
          fixed[p.region] = p.fixed_price.toString();
        }
      });
      setRegionalPrices(discounts);
      setFixedPrices(fixed);
    }
  }, [existingRegionalPricing]);

  useEffect(() => {
    if (existingAttributions) {
      setExpertAttributions(existingAttributions.map(a => ({
        id: a.id,
        expert_name: a.expert_name,
        attribution_percentage: Number(a.attribution_percentage),
      })));
    }
  }, [existingAttributions]);

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
          pwyf_enabled: pwyfEnabled,
          pwyf_min_price_usd: pwyfEnabled ? (parseFloat(pwyfMinPrice) || null) : null,
          pwyf_max_price_usd: pwyfEnabled ? (parseFloat(pwyfMaxPrice) || null) : null,
          pwyf_suggested_price_usd: pwyfEnabled ? (parseFloat(pwyfSuggestedPrice) || null) : null,
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
      
      const getCurrency = (region: string) => {
        const regionConfig = REGIONS.find(r => r.value === region);
        return regionConfig?.currency || 'USD';
      };
      
      // Include regions that have either a discount > 0 OR a fixed price set
      const regionsToSave = REGIONS.filter(r => 
        (regionalPrices[r.value] > 0) || (fixedPrices[r.value] && parseFloat(fixedPrices[r.value]) > 0)
      );
      
      const inserts = regionsToSave.map(region => ({
        product_id: product.id,
        region: region.value as any,
        discount_percentage: regionalPrices[region.value] || 0,
        currency: getCurrency(region.value),
        fixed_price: fixedPrices[region.value] ? parseFloat(fixedPrices[region.value]) : null,
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

  const saveExpertAttributionsMutation = useMutation({
    mutationFn: async () => {
      if (!product) return;
      
      // Delete existing
      await supabase
        .from('product_expert_attributions')
        .delete()
        .eq('product_id', product.id);
      
      // Insert new ones
      const inserts = expertAttributions
        .filter(a => a.expert_name && a.attribution_percentage > 0)
        .map(a => ({
          product_id: product.id,
          expert_name: a.expert_name,
          attribution_percentage: a.attribution_percentage,
        }));
      
      if (inserts.length > 0) {
        const { error } = await supabase.from('product_expert_attributions').insert(inserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-expert-attributions'] });
      toast.success('Expert attributions saved');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save expert attributions');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const calculateRegionalPrice = (discount: number, region: typeof REGIONS[0]) => {
    const base = parseFloat(basePrice) || 0;
    const discountedUsd = base * (1 - discount / 100);
    // Apply exchange rate approximation for display
    const exchangeRates: Record<string, number> = { USD: 1, GBP: 0.79, EUR: 0.92 };
    return discountedUsd * (exchangeRates[region.currency] || 1);
  };

  const addExpertAttribution = () => {
    setExpertAttributions([...expertAttributions, { expert_name: '', attribution_percentage: 0 }]);
  };

  const updateExpertAttribution = (index: number, field: keyof ExpertAttribution, value: string | number) => {
    const updated = [...expertAttributions];
    updated[index] = { ...updated[index], [field]: value };
    setExpertAttributions(updated);
  };

  const removeExpertAttribution = (index: number) => {
    setExpertAttributions(expertAttributions.filter((_, i) => i !== index));
  };

  const totalAttribution = expertAttributions.reduce((sum, a) => sum + (a.attribution_percentage || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="pricing">Regional Pricing</TabsTrigger>
            <TabsTrigger value="experts">Experts</TabsTrigger>
            <TabsTrigger value="subscription" disabled={productType !== 'subscription' && productType !== 'membership'}>Subscription</TabsTrigger>
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
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="membership">Membership</SelectItem>
                      <SelectItem value="bundle">Bundle</SelectItem>
                      <SelectItem value="private_lesson">Private Lesson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(productType === 'subscription' || productType === 'membership') && (
                <div className="p-4 rounded-lg border bg-secondary/5">
                  <p className="text-sm text-muted-foreground mb-2">
                    Configure subscription billing, trials, and included items in the Subscription tab after saving.
                  </p>
                  <Badge variant="secondary">{productType === 'membership' ? 'Membership Product' : 'Subscription Product'}</Badge>
                </div>
              )}

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

              {/* Pay What You Feel Pricing */}
              <div className="space-y-4 p-4 rounded-lg border bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pwyfEnabled" className="font-medium">Pay What You Feel</Label>
                    <p className="text-xs text-muted-foreground">Let customers choose their price</p>
                  </div>
                  <Switch id="pwyfEnabled" checked={pwyfEnabled} onCheckedChange={setPwyfEnabled} />
                </div>
                
                {pwyfEnabled && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pwyfMin">Min Price (USD)</Label>
                      <Input 
                        id="pwyfMin" 
                        type="number" 
                        min="0" 
                        step="1" 
                        value={pwyfMinPrice} 
                        onChange={(e) => setPwyfMinPrice(e.target.value)} 
                        placeholder="5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pwyfSuggested">Suggested (USD)</Label>
                      <Input 
                        id="pwyfSuggested" 
                        type="number" 
                        min="0" 
                        step="1" 
                        value={pwyfSuggestedPrice} 
                        onChange={(e) => setPwyfSuggestedPrice(e.target.value)} 
                        placeholder="10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pwyfMax">Max Price (USD)</Label>
                      <Input 
                        id="pwyfMax" 
                        type="number" 
                        min="0" 
                        step="1" 
                        value={pwyfMaxPrice} 
                        onChange={(e) => setPwyfMaxPrice(e.target.value)} 
                        placeholder="100"
                      />
                    </div>
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
              <p className="text-sm text-muted-foreground">
                Set regional pricing using percentages (calculates from base ${basePrice || '0'}) or exact fixed prices. Fixed prices override percentage discounts.
              </p>
              
              <div className="space-y-3">
                {REGIONS.map((region) => {
                  const hasFixedPrice = fixedPrices[region.value] && parseFloat(fixedPrices[region.value]) > 0;
                  const finalPrice = hasFixedPrice 
                    ? parseFloat(fixedPrices[region.value]) 
                    : calculateRegionalPrice(regionalPrices[region.value] || 0, region);
                  
                  return (
                    <div key={region.value} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{region.label}</p>
                          <p className="text-sm text-muted-foreground">
                            Final: {region.symbol}{finalPrice.toFixed(2)} {region.currency}
                            {hasFixedPrice && <span className="text-xs ml-1">(fixed)</span>}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            className="w-full"
                            value={regionalPrices[region.value] || ''}
                            onChange={(e) => setRegionalPrices({ ...regionalPrices, [region.value]: parseInt(e.target.value) || 0 })}
                            placeholder={region.defaultDiscount.toString()}
                            disabled={hasFixedPrice}
                          />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">% off</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{region.symbol}</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full"
                            value={fixedPrices[region.value] || ''}
                            onChange={(e) => setFixedPrices({ ...fixedPrices, [region.value]: e.target.value })}
                            placeholder="Exact price"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <Button onClick={() => saveRegionalPricingMutation.mutate()} disabled={saveRegionalPricingMutation.isPending} className="w-full">
                {saveRegionalPricingMutation.isPending ? 'Saving...' : 'Save Regional Pricing'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="experts">
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Expert Attributions</p>
                  <p className="text-sm text-muted-foreground">Assign percentage of revenue to each expert</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addExpertAttribution}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Expert
                </Button>
              </div>

              {expertAttributions.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">No experts assigned yet</p>
                  <Button type="button" variant="outline" size="sm" onClick={addExpertAttribution} className="mt-2">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Expert
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {expertAttributions.map((attribution, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="flex-1">
                        <Select 
                          value={attribution.expert_name} 
                          onValueChange={(val) => updateExpertAttribution(index, 'expert_name', val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select expert" />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPERTS.map((expert) => (
                              <SelectItem key={expert} value={expert}>{expert}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="w-20"
                          value={attribution.attribution_percentage || ''}
                          onChange={(e) => updateExpertAttribution(index, 'attribution_percentage', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExpertAttribution(index)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {expertAttributions.length > 0 && (
                <div className={`p-3 rounded-lg border ${totalAttribution > 100 ? 'border-destructive bg-destructive/10' : 'bg-muted/50'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Attribution</span>
                    <span className={`font-bold ${totalAttribution > 100 ? 'text-destructive' : ''}`}>
                      {totalAttribution.toFixed(1)}%
                    </span>
                  </div>
                  {totalAttribution > 100 && (
                    <p className="text-sm text-destructive mt-1">Total exceeds 100%</p>
                  )}
                </div>
              )}

              <Button 
                onClick={() => saveExpertAttributionsMutation.mutate()} 
                disabled={saveExpertAttributionsMutation.isPending || totalAttribution > 100} 
                className="w-full"
              >
                {saveExpertAttributionsMutation.isPending ? 'Saving...' : 'Save Expert Attributions'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="subscription">
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Configure subscription billing intervals, trial periods, and included items (courses, products, course groups).
              </p>
              {product?.id ? (
                <SubscriptionEditorInline productId={product.id} />
              ) : (
                <div className="p-4 rounded-lg border bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Save the product first to configure subscription settings.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="automation">
            <AutomationTagsEditor productId={product?.id || ''} tags={tags || []} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
