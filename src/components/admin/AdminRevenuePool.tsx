import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { DollarSign, Calendar, Save } from 'lucide-react';
import { format } from 'date-fns';

const CURRENCIES = ['GBP', 'USD', 'EUR'];
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
  const [poolAmount, setPoolAmount] = useState('');
  const [currency, setCurrency] = useState('GBP');
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
  useState(() => {
    if (currentPool) {
      setPoolAmount(currentPool.pool_amount.toString());
      setCurrency(currentPool.currency);
      setNotes(currentPool.notes || '');
    } else {
      setPoolAmount('');
      setCurrency('GBP');
      setNotes('');
    }
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(poolAmount);
      if (isNaN(amount) || amount < 0) {
        throw new Error('Please enter a valid amount');
      }

      const { error } = await supabase
        .from('revenue_pool_settings')
        .upsert({
          year: selectedYear,
          month: selectedMonth,
          pool_amount: amount,
          currency,
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Pool Configuration
          </CardTitle>
          <CardDescription>
            Set the monthly revenue pool amount that will be distributed to artists based on their play credits
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

          {/* Pool Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pool Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={poolAmount}
                onChange={(e) => setPoolAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
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
              {poolAmount && platformCredits?.total && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Rate per Credit:</span>
                  <span className="ml-2 font-medium">
                    {currency} {(parseFloat(poolAmount) / platformCredits.total).toFixed(4)}
                  </span>
                </div>
              )}
            </div>
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
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
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
                      setPoolAmount(pool.pool_amount.toString());
                      setCurrency(pool.currency);
                      setNotes(pool.notes || '');
                    }}
                  >
                    <TableCell>
                      {MONTHS[pool.month - 1]} {pool.year}
                    </TableCell>
                    <TableCell className="font-medium">
                      {pool.currency} {Number(pool.pool_amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {pool.notes || '-'}
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
