import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOtherIncome, OTHER_INCOME_CATEGORIES } from '@/hooks/useOtherIncome';
import { OtherIncome, OtherIncomeCategory } from '@/types/database';
import { Plus, Trash2, Pencil, Wallet } from 'lucide-react';
import { format } from 'date-fns';

const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
};

export function OtherIncomeSection() {
  const { otherIncome, isLoading, createOtherIncome, updateOtherIncome, deleteOtherIncome } = useOtherIncome();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<OtherIncome | null>(null);
  
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'other' as OtherIncomeCategory,
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    currency: 'GBP',
  });

  const resetForm = () => {
    setForm({
      description: '',
      amount: '',
      category: 'other',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      currency: 'GBP',
    });
    setEditingIncome(null);
  };

  const handleOpenDialog = (income?: OtherIncome) => {
    if (income) {
      setEditingIncome(income);
      setForm({
        description: income.description,
        amount: income.amount.toString(),
        category: income.category,
        date: income.date,
        notes: income.notes || '',
        currency: income.currency,
      });
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

  const totalOtherIncome = otherIncome.reduce((sum, inc) => sum + inc.amount, 0);

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
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
              <span className="text-sm text-muted-foreground">Total Other Income</span>
              <span className="text-lg font-bold text-success">{formatCurrency(totalOtherIncome)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
