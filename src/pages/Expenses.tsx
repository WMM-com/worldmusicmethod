import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { useExpenses } from '@/hooks/useExpenses';
import { useEvents } from '@/hooks/useEvents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Receipt, Upload, Loader2, Filter, X, Pencil } from 'lucide-react';
import { ReceiptLink } from '@/components/expenses/ReceiptLink';
import { Expense } from '@/types/database';
import { ExpenseCategory } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CURRENCIES, getCurrencySymbol, convertCurrency, formatCurrency } from '@/lib/currency';

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'travel', label: 'Travel' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'food', label: 'Food & Meals' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'software', label: 'Software' },
  { value: 'other', label: 'Other' },
];

const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200),
  amount: z.string().min(1, 'Amount is required'),
  currency: z.string().default('GBP'),
  category: z.enum(['travel', 'equipment', 'food', 'accommodation', 'marketing', 'software', 'other']),
  date: z.string().min(1, 'Date is required'),
  event_id: z.string().optional(),
  notes: z.string().max(500).optional(),
  is_tax_deductible: z.boolean().default(true),
  deductible_percentage: z.string().default('100'),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function Expenses() {
  const { user, profile } = useAuth();
  const defaultCurrency = profile?.default_currency || 'GBP';
  const { expenses, isLoading, createExpense, updateExpense, deleteExpense } = useExpenses();
  const { events } = useEvents();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [estimatedDefaultAmount, setEstimatedDefaultAmount] = useState<number>(0);
  
  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: '',
      currency: defaultCurrency,
      category: 'other',
      date: format(new Date(), 'yyyy-MM-dd'),
      event_id: '',
      notes: '',
      is_tax_deductible: true,
      deductible_percentage: '100',
    },
  });

  // Update default currency when profile loads
  useEffect(() => {
    if (defaultCurrency) {
      form.setValue('currency', defaultCurrency);
    }
  }, [defaultCurrency, form]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // Category filter
      if (categoryFilter !== 'all' && expense.category !== categoryFilter) {
        return false;
      }
      
      // Date range filter
      if (startDate || endDate) {
        const expenseDate = parseISO(expense.date);
        const start = startDate ? startOfDay(parseISO(startDate)) : null;
        const end = endDate ? endOfDay(parseISO(endDate)) : null;
        
        if (start && end) {
          if (!isWithinInterval(expenseDate, { start, end })) return false;
        } else if (start && expenseDate < start) {
          return false;
        } else if (end && expenseDate > end) {
          return false;
        }
      }
      
      return true;
    });
  }, [expenses, categoryFilter, startDate, endDate]);

  const clearFilters = () => {
    setCategoryFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = categoryFilter !== 'all' || startDate || endDate;

  const formatAmount = (amount: number, currency: string = defaultCurrency) => {
    return formatCurrency(amount, currency);
  };

  const getCategoryColor = (category: ExpenseCategory) => {
    const colors: Record<ExpenseCategory, string> = {
      travel: 'bg-blue-500/20 text-blue-400',
      equipment: 'bg-purple-500/20 text-purple-400',
      food: 'bg-orange-500/20 text-orange-400',
      accommodation: 'bg-indigo-500/20 text-indigo-400',
      marketing: 'bg-pink-500/20 text-pink-400',
      software: 'bg-cyan-500/20 text-cyan-400',
      other: 'bg-gray-500/20 text-gray-400',
    };
    return colors[category];
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('receipts')
      .upload(fileName, file);
    
    if (error) {
      toast.error('Failed to upload receipt');
      return null;
    }
    
    // Store only the file path - we'll generate signed URLs when displaying
    return fileName;
  };

  const getReceiptSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error) return null;
    return data.signedUrl;
  };

  const onSubmit = async (data: ExpenseFormData) => {
    setUploading(true);
    
    let receiptUrl: string | null = editingExpense?.receipt_url || null;
    if (receiptFile) {
      receiptUrl = await uploadReceipt(receiptFile);
    }

    if (editingExpense) {
      await updateExpense.mutateAsync({
        id: editingExpense.id,
        description: data.description,
        amount: parseFloat(data.amount),
        currency: data.currency,
        category: data.category as ExpenseCategory,
        date: data.date,
        event_id: data.event_id || null,
        notes: data.notes || null,
        receipt_url: receiptUrl,
        is_tax_deductible: data.is_tax_deductible,
        deductible_percentage: parseInt(data.deductible_percentage),
      });
    } else {
      await createExpense.mutateAsync({
        description: data.description,
        amount: parseFloat(data.amount),
        currency: data.currency,
        category: data.category as ExpenseCategory,
        date: data.date,
        event_id: data.event_id || null,
        notes: data.notes || null,
        receipt_url: receiptUrl,
        is_tax_deductible: data.is_tax_deductible,
        deductible_percentage: parseInt(data.deductible_percentage),
      });
    }

    setUploading(false);
    setReceiptFile(null);
    setEditingExpense(null);
    setEstimatedDefaultAmount(0);
    form.reset();
    setIsDialogOpen(false);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    const expenseCurrency = expense.currency || defaultCurrency;
    form.reset({
      description: expense.description,
      amount: String(expense.amount),
      currency: expenseCurrency,
      category: expense.category as ExpenseCategory,
      date: expense.date,
      event_id: expense.event_id || '',
      notes: expense.notes || '',
      is_tax_deductible: expense.is_tax_deductible ?? true,
      deductible_percentage: String(expense.deductible_percentage ?? 100),
    });
    if (expenseCurrency !== defaultCurrency) {
      setEstimatedDefaultAmount(convertCurrency(expense.amount, expenseCurrency, defaultCurrency));
    }
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingExpense(null);
      form.reset({
        description: '',
        amount: '',
        currency: defaultCurrency,
        category: 'other',
        date: format(new Date(), 'yyyy-MM-dd'),
        event_id: '',
        notes: '',
        is_tax_deductible: true,
        deductible_percentage: '100',
      });
      setReceiptFile(null);
      setEstimatedDefaultAmount(0);
    }
    setIsDialogOpen(open);
  };

  const handleDelete = async (id: string) => {
    await deleteExpense.mutateAsync(id);
  };

  // Calculate total expenses in default currency
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => {
      const expCurrency = exp.currency || defaultCurrency;
      const amount = Number(exp.amount);
      if (expCurrency === defaultCurrency) {
        return sum + amount;
      }
      return sum + convertCurrency(amount, expCurrency, defaultCurrency);
    }, 0);
  }, [filteredExpenses, defaultCurrency]);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Expenses</h1>
            <p className="text-muted-foreground">Track and manage your business expenses</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Train ticket to London" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            const amount = parseFloat(form.getValues('amount')) || 0;
                            if (value !== defaultCurrency && amount > 0) {
                              setEstimatedDefaultAmount(convertCurrency(amount, value, defaultCurrency));
                            } else {
                              setEstimatedDefaultAmount(0);
                            }
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CURRENCIES.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.symbol} {c.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ({getCurrencySymbol(form.watch('currency'))})</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                const amount = parseFloat(e.target.value) || 0;
                                const currency = form.getValues('currency');
                                if (currency !== defaultCurrency && amount > 0) {
                                  setEstimatedDefaultAmount(convertCurrency(amount, currency, defaultCurrency));
                                } else {
                                  setEstimatedDefaultAmount(0);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Show estimated amount in default currency when using different currency */}
                  {form.watch('currency') !== defaultCurrency && (
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

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="event_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link to Event (Optional)</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select event" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No event</SelectItem>
                            {events.map((event) => (
                              <SelectItem key={event.id} value={event.id}>
                                {event.title} - {format(new Date(event.start_time), 'MMM d, yyyy')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional details..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tax Deductibility */}
                  <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                    <FormField
                      control={form.control}
                      name="is_tax_deductible"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Tax Deductible</FormLabel>
                            <FormDescription>
                              This expense can be claimed against taxable income
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    {form.watch('is_tax_deductible') && (
                      <FormField
                        control={form.control}
                        name="deductible_percentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deductible Percentage</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select percentage" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="100">100% (Fully deductible)</SelectItem>
                                <SelectItem value="75">75%</SelectItem>
                                <SelectItem value="50">50%</SelectItem>
                                <SelectItem value="30">30% (e.g., phone bill)</SelectItem>
                                <SelectItem value="25">25%</SelectItem>
                                <SelectItem value="20">20%</SelectItem>
                                <SelectItem value="10">10%</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              For mixed-use expenses (e.g., rent, phone), select the business portion
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div>
                    <FormLabel>Receipt {editingExpense?.receipt_url ? '(Current receipt exists)' : '(Optional)'}</FormLabel>
                    <div className="mt-2">
                      <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {receiptFile ? receiptFile.name : 'Upload new receipt image'}
                        </span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>

                  <Button type="submit" className="w-full gradient-primary" disabled={uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingExpense ? 'Save Changes' : 'Add Expense'
                    )}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Filter by:</span>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Category</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">From</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">To</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            {hasActiveFilters && (
              <p className="text-sm text-muted-foreground mt-3">
                Showing {filteredExpenses.length} of {expenses.length} expenses
              </p>
            )}
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">
              {hasActiveFilters ? 'Filtered Total' : 'Total Expenses'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{formatAmount(totalExpenses, defaultCurrency)}</p>
            <p className="text-sm text-muted-foreground mt-1">Converted to {defaultCurrency}</p>
          </CardContent>
        </Card>
        {/* Expenses Table */}
        <Card className="glass">
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">
                  {hasActiveFilters ? 'No matching expenses' : 'No expenses yet'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {hasActiveFilters 
                    ? 'Try adjusting your filters' 
                    : 'Start tracking your expenses by adding one above'}
                </p>
              </div>
            ) : (
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(expense.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          {expense.notes && (
                            <p className="text-sm text-muted-foreground truncate max-w-xs">{expense.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getCategoryColor(expense.category as ExpenseCategory)}>
                          {EXPENSE_CATEGORIES.find((c) => c.value === expense.category)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(expense.amount))}
                      </TableCell>
                      <TableCell>
                        {expense.receipt_url ? (
                          <ReceiptLink filePath={expense.receipt_url} />
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this expense? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(expense.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}