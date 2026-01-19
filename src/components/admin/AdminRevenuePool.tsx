import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DollarSign, Save, Percent, Info, Edit, Trash2, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Beta Membership product ID
const BETA_MEMBERSHIP_PRODUCT_ID = 'a0e4cee3-0074-4246-8162-f1d9c69b32d8';

export function AdminRevenuePool() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [percentageOfRevenue, setPercentageOfRevenue] = useState(50);
  const [notes, setNotes] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poolToDelete, setPoolToDelete] = useState<{ year: number; month: number; id: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<any>(null);

  // Fetch all revenue pool settings
  const { data: poolSettings, isLoading, refetch: refetchSettings } = useQuery({
    queryKey: ['admin-revenue-pool-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_pool_settings')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch current selection
  const { data: currentPool } = useQuery({
    queryKey: ['admin-revenue-pool', selectedYear, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_pool_settings')
        .select('*')
        .eq('year', selectedYear)
        .eq('month', selectedMonth)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch Beta Membership revenue for selected month (dynamic calculation)
  const { data: betaMembershipRevenue, refetch: refetchRevenue } = useQuery({
    queryKey: ['beta-membership-revenue', selectedYear, selectedMonth],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date(selectedYear, selectedMonth - 1));
      const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth - 1));

      // Fetch orders for Beta Membership product
      const { data: orders, error } = await supabase
        .from('orders')
        .select('amount, currency, net_amount, stripe_fee, paypal_fee, status')
        .eq('product_id', BETA_MEMBERSHIP_PRODUCT_ID)
        .eq('status', 'completed')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      if (error) throw error;

      // Calculate net revenue by currency (after fees)
      const revenueByC: Record<string, number> = { GBP: 0, USD: 0, EUR: 0 };
      
      orders?.forEach(order => {
        const currency = (order.currency || 'USD').toUpperCase();
        // Use net_amount if available, otherwise calculate
        const netAmount = order.net_amount ?? (
          order.amount - (order.stripe_fee || 0) - (order.paypal_fee || 0)
        );
        
        if (currency in revenueByC) {
          revenueByC[currency] += Number(netAmount) || 0;
        }
      });

      return revenueByC;
    },
  });

  // Get platform credits for each month (for rate per credit in history)
  const { data: allCredits } = useQuery({
    queryKey: ['admin-all-platform-credits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_artist_credits')
        .select('year, month, total_play_credits');
      if (error) throw error;
      
      // Group by year-month
      const creditsByMonth: Record<string, number> = {};
      data?.forEach(row => {
        const key = `${row.year}-${row.month}`;
        creditsByMonth[key] = (creditsByMonth[key] || 0) + Number(row.total_play_credits);
      });
      return creditsByMonth;
    },
  });

  // Update form when selection changes
  useEffect(() => {
    if (currentPool) {
      setPercentageOfRevenue(Number(currentPool.percentage_of_revenue) || 50);
      setNotes(currentPool.notes || '');
    } else {
      setPercentageOfRevenue(50);
      setNotes('');
    }
  }, [currentPool]);

  // Calculate pool amounts based on percentage
  const calculatedPoolAmounts = {
    GBP: ((betaMembershipRevenue?.GBP || 0) * percentageOfRevenue) / 100,
    USD: ((betaMembershipRevenue?.USD || 0) * percentageOfRevenue) / 100,
    EUR: ((betaMembershipRevenue?.EUR || 0) * percentageOfRevenue) / 100,
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('revenue_pool_settings')
        .upsert({
          year: selectedYear,
          month: selectedMonth,
          percentage_of_revenue: percentageOfRevenue,
          pool_amount_gbp: calculatedPoolAmounts.GBP,
          pool_amount_usd: calculatedPoolAmounts.USD,
          pool_amount_eur: calculatedPoolAmounts.EUR,
          pool_amount: calculatedPoolAmounts.GBP, // Keep legacy field
          currency: 'GBP', // Legacy field
          notes: notes || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'year,month' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-revenue-pool-settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-revenue-pool'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-pool'] });
      toast.success('Revenue pool updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update revenue pool');
    },
  });

  // Update mutation for editing existing pools
  const updatePoolMutation = useMutation({
    mutationFn: async (pool: { id: string; percentage_of_revenue: number; notes: string }) => {
      // Recalculate based on historical revenue for that month
      const monthStart = startOfMonth(new Date(editingPool.year, editingPool.month - 1));
      const monthEnd = endOfMonth(new Date(editingPool.year, editingPool.month - 1));

      const { data: orders } = await supabase
        .from('orders')
        .select('amount, currency, net_amount, stripe_fee, paypal_fee, status')
        .eq('product_id', BETA_MEMBERSHIP_PRODUCT_ID)
        .eq('status', 'completed')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      const revenueByC: Record<string, number> = { GBP: 0, USD: 0, EUR: 0 };
      orders?.forEach(order => {
        const currency = (order.currency || 'USD').toUpperCase();
        const netAmount = order.net_amount ?? (order.amount - (order.stripe_fee || 0) - (order.paypal_fee || 0));
        if (currency in revenueByC) {
          revenueByC[currency] += Number(netAmount) || 0;
        }
      });

      const { error } = await supabase
        .from('revenue_pool_settings')
        .update({
          percentage_of_revenue: pool.percentage_of_revenue,
          pool_amount_gbp: (revenueByC.GBP * pool.percentage_of_revenue) / 100,
          pool_amount_usd: (revenueByC.USD * pool.percentage_of_revenue) / 100,
          pool_amount_eur: (revenueByC.EUR * pool.percentage_of_revenue) / 100,
          pool_amount: (revenueByC.GBP * pool.percentage_of_revenue) / 100,
          notes: pool.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pool.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-revenue-pool-settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-revenue-pool'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-pool'] });
      toast.success('Revenue pool updated');
      setEditDialogOpen(false);
      setEditingPool(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update revenue pool');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('revenue_pool_settings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-revenue-pool-settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-revenue-pool'] });
      toast.success('Revenue pool deleted');
      setDeleteDialogOpen(false);
      setPoolToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete revenue pool');
    },
  });

  // Get platform credits for selected month
  const { data: platformCredits } = useQuery({
    queryKey: ['admin-platform-credits', selectedYear, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_artist_credits')
        .select('artist_id, total_play_credits, media_artists(name)')
        .eq('year', selectedYear)
        .eq('month', selectedMonth);
      if (error) throw error;
      
      const total = data?.reduce((sum, row) => sum + Number(row.total_play_credits), 0) || 0;
      return { total, breakdown: data || [] };
    },
  });

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const formatCurrency = (amount: number | string, currency: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(num);
  };

  const getRatePerCredit = (pool: any) => {
    const key = `${pool.year}-${pool.month}`;
    const totalCredits = allCredits?.[key] || 0;
    if (totalCredits === 0) return null;
    
    const rates: string[] = [];
    if (pool.pool_amount_gbp > 0) {
      rates.push(`£${(pool.pool_amount_gbp / totalCredits).toFixed(4)}`);
    }
    if (pool.pool_amount_usd > 0) {
      rates.push(`$${(pool.pool_amount_usd / totalCredits).toFixed(4)}`);
    }
    if (pool.pool_amount_eur > 0) {
      rates.push(`€${(pool.pool_amount_eur / totalCredits).toFixed(4)}`);
    }
    return rates.length > 0 ? rates.join(' / ') : '-';
  };

  const handleEditPool = (pool: any) => {
    setEditingPool({
      ...pool,
      percentage_of_revenue: pool.percentage_of_revenue || 50,
      notes: pool.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (pool: any) => {
    setPoolToDelete({ year: pool.year, month: pool.month, id: pool.id });
    setDeleteDialogOpen(true);
  };

  const handleRefreshRevenue = () => {
    refetchRevenue();
    refetchSettings();
    toast.success('Revenue data refreshed');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Pool Configuration
          </CardTitle>
          <CardDescription>
            Revenue pool amounts are calculated automatically from Beta Membership sales (after payment fees)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Month/Year Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Beta Membership Revenue Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Beta Membership Net Revenue for {MONTHS[selectedMonth - 1]} {selectedYear}</h4>
              <Button variant="ghost" size="sm" onClick={handleRefreshRevenue}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">GBP:</span>
                <span className="ml-2 font-medium">{formatCurrency(betaMembershipRevenue?.GBP || 0, 'GBP')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">USD:</span>
                <span className="ml-2 font-medium">{formatCurrency(betaMembershipRevenue?.USD || 0, 'USD')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">EUR:</span>
                <span className="ml-2 font-medium">{formatCurrency(betaMembershipRevenue?.EUR || 0, 'EUR')}</span>
              </div>
            </div>
          </div>

          {/* Percentage of Revenue */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label>Percentage of Beta Membership Revenue for Artists</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>This is the percentage of net Beta Membership revenue (after Stripe/PayPal fees) that goes into the artist royalty pool.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                value={[percentageOfRevenue]}
                onValueChange={(v) => setPercentageOfRevenue(v[0])}
                max={100}
                min={0}
                step={1}
                className="flex-1"
              />
              <div className="flex items-center gap-1 min-w-[60px]">
                <span className="text-2xl font-bold">{percentageOfRevenue}</span>
                <Percent className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Calculated Pool Amounts */}
          <div className="space-y-4">
            <Label>Calculated Artist Pool Amounts ({percentageOfRevenue}% of revenue)</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">GBP Pool</p>
                <p className="text-xl font-bold">{formatCurrency(calculatedPoolAmounts.GBP, 'GBP')}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">USD Pool</p>
                <p className="text-xl font-bold">{formatCurrency(calculatedPoolAmounts.USD, 'USD')}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">EUR Pool</p>
                <p className="text-xl font-bold">{formatCurrency(calculatedPoolAmounts.EUR, 'EUR')}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add any notes about this revenue pool..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Platform Stats */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Platform Stats for {MONTHS[selectedMonth - 1]} {selectedYear}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Play Credits:</span>
                <span className="ml-2 font-medium">{platformCredits?.total.toFixed(1) || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Active Artists:</span>
                <span className="ml-2 font-medium">{platformCredits?.breakdown.length || 0}</span>
              </div>
            </div>
            
            {platformCredits?.total && platformCredits.total > 0 && (
              <div className="border-t border-border pt-3 mt-3">
                <p className="text-sm font-medium mb-2">Rate per Credit:</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {calculatedPoolAmounts.GBP > 0 && (
                    <div>
                      <span className="text-muted-foreground">GBP:</span>
                      <span className="ml-1 font-medium">
                        £{(calculatedPoolAmounts.GBP / platformCredits.total).toFixed(4)}
                      </span>
                    </div>
                  )}
                  {calculatedPoolAmounts.USD > 0 && (
                    <div>
                      <span className="text-muted-foreground">USD:</span>
                      <span className="ml-1 font-medium">
                        ${(calculatedPoolAmounts.USD / platformCredits.total).toFixed(4)}
                      </span>
                    </div>
                  )}
                  {calculatedPoolAmounts.EUR > 0 && (
                    <div>
                      <span className="text-muted-foreground">EUR:</span>
                      <span className="ml-1 font-medium">
                        €{(calculatedPoolAmounts.EUR / platformCredits.total).toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Revenue Pool Settings
          </Button>
        </CardContent>
      </Card>

      {/* Historical Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Pool History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Loading...</p>
          ) : !poolSettings?.length ? (
            <p className="text-center text-muted-foreground py-4">No revenue pools configured yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>GBP</TableHead>
                  <TableHead>USD</TableHead>
                  <TableHead>EUR</TableHead>
                  <TableHead>Rate/Credit</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poolSettings.map((pool) => (
                  <TableRow key={pool.id}>
                    <TableCell>
                      {MONTHS[pool.month - 1]} {pool.year}
                    </TableCell>
                    <TableCell className="font-medium">
                      {pool.percentage_of_revenue || 50}%
                    </TableCell>
                    <TableCell>
                      {formatCurrency(pool.pool_amount_gbp || 0, 'GBP')}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(pool.pool_amount_usd || 0, 'USD')}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(pool.pool_amount_eur || 0, 'EUR')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {getRatePerCredit(pool) || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(pool.updated_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleEditPool(pool)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDeleteClick(pool)}
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
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) setEditingPool(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Revenue Pool - {editingPool ? `${MONTHS[editingPool.month - 1]} ${editingPool.year}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-4">
              <Label>Percentage of Revenue</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[editingPool?.percentage_of_revenue || 50]}
                  onValueChange={(v) => setEditingPool((prev: any) => prev ? { ...prev, percentage_of_revenue: v[0] } : null)}
                  max={100}
                  min={0}
                  step={1}
                  className="flex-1"
                />
                <div className="flex items-center gap-1 min-w-[60px]">
                  <span className="text-2xl font-bold">{editingPool?.percentage_of_revenue || 50}</span>
                  <Percent className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editingPool?.notes || ''}
                onChange={(e) => setEditingPool((prev: any) => prev ? { ...prev, notes: e.target.value } : null)}
              />
            </div>
            <Button 
              onClick={() => editingPool && updatePoolMutation.mutate(editingPool)}
              disabled={updatePoolMutation.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Update Revenue Pool
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Revenue Pool</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the revenue pool for {poolToDelete ? `${MONTHS[poolToDelete.month - 1]} ${poolToDelete.year}` : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => poolToDelete && deleteMutation.mutate(poolToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}