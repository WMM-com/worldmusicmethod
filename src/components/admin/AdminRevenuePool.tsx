import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';
import { DollarSign, Calendar, Save, Percent, Info } from 'lucide-react';
import { format } from 'date-fns';
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

export function AdminRevenuePool() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [percentageOfRevenue, setPercentageOfRevenue] = useState(50);
  const [poolAmountGBP, setPoolAmountGBP] = useState('');
  const [poolAmountUSD, setPoolAmountUSD] = useState('');
  const [poolAmountEUR, setPoolAmountEUR] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch all revenue pool settings
  const { data: poolSettings, isLoading } = useQuery({
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

  // Update form when selection changes
  useEffect(() => {
    if (currentPool) {
      setPercentageOfRevenue(Number(currentPool.percentage_of_revenue) || 50);
      setPoolAmountGBP(currentPool.pool_amount_gbp?.toString() || '0');
      setPoolAmountUSD(currentPool.pool_amount_usd?.toString() || '0');
      setPoolAmountEUR(currentPool.pool_amount_eur?.toString() || '0');
      setNotes(currentPool.notes || '');
    } else {
      setPercentageOfRevenue(50);
      setPoolAmountGBP('');
      setPoolAmountUSD('');
      setPoolAmountEUR('');
      setNotes('');
    }
  }, [currentPool]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const gbp = parseFloat(poolAmountGBP) || 0;
      const usd = parseFloat(poolAmountUSD) || 0;
      const eur = parseFloat(poolAmountEUR) || 0;
      
      if (gbp < 0 || usd < 0 || eur < 0) {
        throw new Error('Amounts cannot be negative');
      }

      const { error } = await supabase
        .from('revenue_pool_settings')
        .upsert({
          year: selectedYear,
          month: selectedMonth,
          percentage_of_revenue: percentageOfRevenue,
          pool_amount_gbp: gbp,
          pool_amount_usd: usd,
          pool_amount_eur: eur,
          pool_amount: gbp, // Keep legacy field for backwards compatibility
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

  const totalPool = (parseFloat(poolAmountGBP) || 0) + (parseFloat(poolAmountUSD) || 0) + (parseFloat(poolAmountEUR) || 0);

  const formatCurrency = (amount: number | string, currency: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(num);
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
            Set the monthly revenue pool amounts from Beta Membership revenue to distribute to artists
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

          {/* Multi-Currency Pool Amounts */}
          <div className="space-y-4">
            <Label>Net Revenue Pool Amounts (after payment fees)</Label>
            <p className="text-sm text-muted-foreground">
              Enter the actual amount allocated to the artist pool for each currency
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">GBP (£)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={poolAmountGBP}
                    onChange={(e) => setPoolAmountGBP(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">USD ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={poolAmountUSD}
                    onChange={(e) => setPoolAmountUSD(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">EUR (€)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={poolAmountEUR}
                    onChange={(e) => setPoolAmountEUR(e.target.value)}
                    className="pl-7"
                  />
                </div>
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
                  {parseFloat(poolAmountGBP) > 0 && (
                    <div>
                      <span className="text-muted-foreground">GBP:</span>
                      <span className="ml-1 font-medium">
                        £{(parseFloat(poolAmountGBP) / platformCredits.total).toFixed(4)}
                      </span>
                    </div>
                  )}
                  {parseFloat(poolAmountUSD) > 0 && (
                    <div>
                      <span className="text-muted-foreground">USD:</span>
                      <span className="ml-1 font-medium">
                        ${(parseFloat(poolAmountUSD) / platformCredits.total).toFixed(4)}
                      </span>
                    </div>
                  )}
                  {parseFloat(poolAmountEUR) > 0 && (
                    <div>
                      <span className="text-muted-foreground">EUR:</span>
                      <span className="ml-1 font-medium">
                        €{(parseFloat(poolAmountEUR) / platformCredits.total).toFixed(4)}
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
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poolSettings.map((pool) => (
                  <TableRow 
                    key={pool.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedYear(pool.year);
                      setSelectedMonth(pool.month);
                    }}
                  >
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
                    <TableCell className="text-muted-foreground">
                      {format(new Date(pool.updated_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}