import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOtherIncome, OTHER_INCOME_CATEGORIES } from '@/hooks/useOtherIncome';
import { useAuth } from '@/contexts/AuthContext';
import { OtherIncome, OtherIncomeCategory } from '@/types/database';
import { Plus, Trash2, Pencil, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { CURRENCIES, getCurrencySymbol, convertCurrency, formatCurrency } from '@/lib/currency';

export function OtherIncomeSection() {
  const { profile } = useAuth();
  const defaultCurrency = profile?.default_currency || 'GBP';
  const { otherIncome, isLoading, createOtherIncome, updateOtherIncome, deleteOtherIncome } = useOtherIncome();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<OtherIncome | null>(null);
  const [estimatedDefaultAmount, setEstimatedDefaultAmount] = useState<number>(0);
  
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'other' as OtherIncomeCategory,
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    currency: defaultCurrency,
  });

  const resetForm = () => {
    setForm({
      description: '',
      amount: '',
      category: 'other',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      currency: defaultCurrency,
    });
    setEditingIncome(null);
    setEstimatedDefaultAmount(0);
  };

  const handleOpenDialog = (income?: OtherIncome) => {
    if (income) {
      setEditingIncome(income);
      const incomeCurrency = income.currency || defaultCurrency;
      setForm({
        description: income.description,
        amount: income.amount.toString(),
        category: income.category,
        date: income.date,
        notes: income.notes || '',
        currency: incomeCurrency,
      });
      if (incomeCurrency !== defaultCurrency) {
        setEstimatedDefaultAmount(convertCurrency(income.amount, incomeCurrency, defaultCurrency));
      }
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      date: form.date,
      notes: form.notes || null,
      currency: form.currency,
    };

    if (editingIncome) {
      await updateOtherIncome.mutateAsync({ id: editingIncome.id, ...data });
    } else {
      await createOtherIncome.mutateAsync(data);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this income entry?')) {
      await deleteOtherIncome.mutateAsync(id);
    }
  };

  // Calculate total in default currency
  const totalOtherIncome = useMemo(() => {
    return otherIncome.reduce((sum, inc) => {
      const incCurrency = inc.currency || defaultCurrency;
      if (incCurrency === defaultCurrency) {
        return sum + inc.amount;
      }
      return sum + convertCurrency(inc.amount, incCurrency, defaultCurrency);
    }, 0);
  }, [otherIncome, defaultCurrency]);

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Other Income
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Royalties, merch, grants, and other income sources
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Income
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingIncome ? 'Edit Income' : 'Add Other Income'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g., Spotify royalties Q4"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select 
                  value={form.currency} 
                  onValueChange={(v) => {
                    setForm({ ...form, currency: v });
                    const amount = parseFloat(form.amount) || 0;
                    if (v !== defaultCurrency && amount > 0) {
                      setEstimatedDefaultAmount(convertCurrency(amount, v, defaultCurrency));
                    } else {
                      setEstimatedDefaultAmount(0);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount ({getCurrencySymbol(form.currency)})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => {
                      setForm({ ...form, amount: e.target.value });
                      const amount = parseFloat(e.target.value) || 0;
                      if (form.currency !== defaultCurrency && amount > 0) {
                        setEstimatedDefaultAmount(convertCurrency(amount, form.currency, defaultCurrency));
                      } else {
                        setEstimatedDefaultAmount(0);
                      }
                    }}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Show estimated amount in default currency when using different currency */}
              {form.currency !== defaultCurrency && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Estimated in {defaultCurrency}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={estimatedDefaultAmount || ''}
                    onChange={(e) => setEstimatedDefaultAmount(parseFloat(e.target.value) || 0)}
                    placeholder={`Amount in ${defaultCurrency}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated estimate. You can adjust if needed.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as OtherIncomeCategory })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OTHER_INCOME_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional details..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createOtherIncome.isPending || updateOtherIncome.isPending}>
                  {editingIncome ? 'Update' : 'Add'} Income
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : otherIncome.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No other income recorded. Add royalties, merch sales, or other income sources.
          </p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherIncome.slice(0, 5).map((income) => (
                    <TableRow key={income.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(income.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>{income.description}</TableCell>
                      <TableCell>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {OTHER_INCOME_CATEGORIES.find(c => c.value === income.category)?.label || income.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-success">
                        {formatCurrency(income.amount, income.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(income)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(income.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {otherIncome.length > 5 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Showing 5 of {otherIncome.length} entries
              </p>
            )}
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Other Income ({defaultCurrency})</span>
              <span className="text-lg font-bold text-success">{formatCurrency(totalOtherIncome, defaultCurrency)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}