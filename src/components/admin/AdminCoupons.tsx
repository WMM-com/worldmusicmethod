import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Edit, Trash2, Tag, Percent, DollarSign, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Coupon {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  percent_off: number | null;
  amount_off: number | null;
  currency: string;
  duration: 'once' | 'repeating' | 'forever';
  duration_in_months: number | null;
  max_redemptions: number | null;
  times_redeemed: number;
  valid_from: string;
  valid_until: string | null;
  applies_to_subscriptions: boolean;
  applies_to_one_time: boolean;
  is_active: boolean;
  stripe_coupon_id: string | null;
  created_at: string;
}

interface CouponFormData {
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  percent_off: number | null;
  amount_off: number | null;
  currency: string;
  duration: 'once' | 'repeating' | 'forever';
  duration_in_months: number | null;
  max_redemptions: number | null;
  valid_until: string | null;
  applies_to_subscriptions: boolean;
  applies_to_one_time: boolean;
  is_active: boolean;
}

const emptyCoupon: CouponFormData = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percentage',
  percent_off: 10,
  amount_off: null,
  currency: 'USD',
  duration: 'once',
  duration_in_months: null,
  max_redemptions: null,
  valid_until: null,
  applies_to_subscriptions: true,
  applies_to_one_time: true,
  is_active: true,
};

export function AdminCoupons() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState(emptyCoupon);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const insertData: any = {
        code: data.code.toUpperCase(),
        name: data.name || null,
        description: data.description || null,
        discount_type: data.discount_type,
        percent_off: data.discount_type === 'percentage' ? data.percent_off : null,
        amount_off: data.discount_type === 'fixed' ? data.amount_off : null,
        currency: data.currency,
        duration: data.duration,
        duration_in_months: data.duration === 'repeating' ? data.duration_in_months : null,
        max_redemptions: data.max_redemptions || null,
        valid_until: data.valid_until || null,
        applies_to_subscriptions: data.applies_to_subscriptions,
        applies_to_one_time: data.applies_to_one_time,
        is_active: data.is_active,
      };

      const { error } = await supabase.from('coupons').insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Coupon created');
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create coupon');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const updateData: any = {
        code: data.code.toUpperCase(),
        name: data.name || null,
        description: data.description || null,
        discount_type: data.discount_type,
        percent_off: data.discount_type === 'percentage' ? data.percent_off : null,
        amount_off: data.discount_type === 'fixed' ? data.amount_off : null,
        currency: data.currency,
        duration: data.duration,
        duration_in_months: data.duration === 'repeating' ? data.duration_in_months : null,
        max_redemptions: data.max_redemptions || null,
        valid_until: data.valid_until || null,
        applies_to_subscriptions: data.applies_to_subscriptions,
        applies_to_one_time: data.applies_to_one_time,
        is_active: data.is_active,
      };

      const { error } = await supabase.from('coupons').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Coupon updated');
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update coupon');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Coupon deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete coupon');
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCoupon(null);
    setFormData(emptyCoupon);
  };

  const openCreate = () => {
    setEditingCoupon(null);
    setFormData(emptyCoupon);
    setDialogOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name || '',
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      percent_off: coupon.percent_off || 10,
      amount_off: coupon.amount_off,
      currency: coupon.currency,
      duration: coupon.duration,
      duration_in_months: coupon.duration_in_months,
      max_redemptions: coupon.max_redemptions,
      valid_until: coupon.valid_until,
      applies_to_subscriptions: coupon.applies_to_subscriptions,
      applies_to_one_time: coupon.applies_to_one_time,
      is_active: coupon.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.code) {
      toast.error('Please enter a coupon code');
      return;
    }
    if (formData.discount_type === 'percentage' && (!formData.percent_off || formData.percent_off <= 0)) {
      toast.error('Please enter a valid percentage');
      return;
    }
    if (formData.discount_type === 'fixed' && (!formData.amount_off || formData.amount_off <= 0)) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied');
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.percent_off}% off`;
    }
    const symbols: Record<string, string> = { USD: '$', GBP: '£', EUR: '€' };
    return `${symbols[coupon.currency] || coupon.currency}${coupon.amount_off} off`;
  };

  const getDurationLabel = (coupon: Coupon) => {
    switch (coupon.duration) {
      case 'once': return 'Once';
      case 'forever': return 'Forever';
      case 'repeating': return `${coupon.duration_in_months} months`;
      default: return coupon.duration;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Coupons</CardTitle>
              <CardDescription>Create and manage discount codes</CardDescription>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Coupon
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : coupons?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No coupons yet</p>
            <Button variant="link" onClick={openCreate}>Create your first coupon</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons?.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {coupon.code}
                      </code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(coupon.code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {coupon.name && <p className="text-xs text-muted-foreground mt-1">{coupon.name}</p>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {coupon.discount_type === 'percentage' ? (
                        <Percent className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{formatDiscount(coupon)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getDurationLabel(coupon)}</TableCell>
                  <TableCell>
                    {coupon.max_redemptions 
                      ? `${coupon.times_redeemed}/${coupon.max_redemptions}`
                      : `${coupon.times_redeemed} uses`
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {coupon.applies_to_subscriptions && (
                        <Badge variant="outline" className="text-xs">Subs</Badge>
                      )}
                      {coupon.applies_to_one_time && (
                        <Badge variant="outline" className="text-xs">One-time</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                      {coupon.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(coupon)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteMutation.mutate(coupon.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coupon Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER20"
                />
              </div>
              <div className="space-y-2">
                <Label>Name (optional)</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Summer Sale"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(v) => setFormData({ ...formData, discount_type: v as 'percentage' | 'fixed' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.discount_type === 'percentage' ? (
              <div className="space-y-2">
                <Label>Percent Off *</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.percent_off || ''}
                    onChange={(e) => setFormData({ ...formData, percent_off: parseFloat(e.target.value) })}
                    placeholder="20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount Off *</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.amount_off || ''}
                    onChange={(e) => setFormData({ ...formData, amount_off: parseFloat(e.target.value) })}
                    placeholder="10.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(v) => setFormData({ ...formData, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Duration (for subscriptions)</Label>
              <Select
                value={formData.duration}
                onValueChange={(v) => setFormData({ ...formData, duration: v as 'once' | 'repeating' | 'forever' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once (first payment only)</SelectItem>
                  <SelectItem value="repeating">Repeating (multiple months)</SelectItem>
                  <SelectItem value="forever">Forever (all renewals)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.duration === 'repeating' && (
              <div className="space-y-2">
                <Label>Duration in Months</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.duration_in_months || ''}
                  onChange={(e) => setFormData({ ...formData, duration_in_months: parseInt(e.target.value) })}
                  placeholder="3"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Max Redemptions (optional)</Label>
              <Input
                type="number"
                min="1"
                value={formData.max_redemptions || ''}
                onChange={(e) => setFormData({ ...formData, max_redemptions: parseInt(e.target.value) || null })}
                placeholder="Unlimited"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.applies_to_subscriptions}
                  onCheckedChange={(c) => setFormData({ ...formData, applies_to_subscriptions: c })}
                />
                <Label>Subscriptions</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.applies_to_one_time}
                  onCheckedChange={(c) => setFormData({ ...formData, applies_to_one_time: c })}
                />
                <Label>One-time purchases</Label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingCoupon ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}