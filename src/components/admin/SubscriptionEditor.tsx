import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
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
import { Plus, X, Package, BookOpen, FolderOpen } from 'lucide-react';

interface SubscriptionEditorProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubscriptionItem {
  id: string;
  item_type: string;
  item_id: string;
  name?: string;
}

export function SubscriptionEditor({ productId, open, onOpenChange }: SubscriptionEditorProps) {
  const queryClient = useQueryClient();
  const [billingInterval, setBillingInterval] = useState<string>('monthly');
  const [trialEnabled, setTrialEnabled] = useState(false);
  const [trialPrice, setTrialPrice] = useState('0');
  const [trialLengthDays, setTrialLengthDays] = useState('7');
  const [selectedItems, setSelectedItems] = useState<SubscriptionItem[]>([]);

  // Fetch product details
  const { data: product } = useQuery({
    queryKey: ['subscription-product', productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // Fetch existing subscription items
  const { data: existingItems } = useQuery({
    queryKey: ['subscription-items', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('subscription_items')
        .select('*')
        .eq('subscription_product_id', productId);
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // Fetch available courses
  const { data: courses } = useQuery({
    queryKey: ['admin-courses-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('id, title');
      if (error) throw error;
      return data;
    },
  });

  // Fetch available products (non-subscription)
  const { data: products } = useQuery({
    queryKey: ['admin-products-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .is('billing_interval', null)
        .neq('id', productId || '');
      if (error) throw error;
      return data;
    },
  });

  // Fetch course groups
  const { data: courseGroups } = useQuery({
    queryKey: ['admin-course-groups-list'],
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
      // Map existing items with names
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
      if (!productId) return;

      // Update product subscription settings
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

      // Delete existing items
      await supabase
        .from('subscription_items')
        .delete()
        .eq('subscription_product_id', productId);

      // Insert new items
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
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subscription Settings</DialogTitle>
        </DialogHeader>

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

            {/* Selected items */}
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

            {/* Add items */}
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
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Subscription Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
