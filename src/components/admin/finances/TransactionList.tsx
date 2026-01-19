import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Wand2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Transaction } from '@/hooks/useFinancialDashboard';
import { CATEGORY_LABELS } from '@/hooks/useFinancialDashboard';

interface Props {
  transactions: Transaction[];
  isLoading: boolean;
  onCategorize: (params: { transactionId: string; category: string | null }) => void;
  onApplyAutoCategorization: () => void;
  isSyncing: boolean;
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const SOURCE_COLORS: Record<string, string> = {
  paypal: 'bg-blue-500/10 text-blue-500',
  wise: 'bg-green-500/10 text-green-500',
  stripe: 'bg-purple-500/10 text-purple-500',
};

export function TransactionList({ 
  transactions, 
  isLoading, 
  onCategorize, 
  onApplyAutoCategorization,
  isSyncing 
}: Props) {
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = !search || 
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.merchant_name?.toLowerCase().includes(search.toLowerCase());
    const matchesSource = filterSource === 'all' || t.source === filterSource;
    const matchesCategory = filterCategory === 'all' || 
      (filterCategory === 'uncategorized' ? !t.transaction_type : t.transaction_type === filterCategory);
    return matchesSearch && matchesSource && matchesCategory;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onApplyAutoCategorization}
            disabled={isSyncing}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-Categorize
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search transactions..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="paypal">PayPal</SelectItem>
              <SelectItem value="wise">Wise</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="uncategorized">Uncategorized</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.slice(0, 100).map(transaction => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(transaction.transaction_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={SOURCE_COLORS[transaction.source] || ''}>
                        {transaction.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      <div>
                        <span className="font-medium">{transaction.merchant_name || 'Unknown'}</span>
                        {transaction.description && (
                          <p className="text-xs text-muted-foreground truncate">{transaction.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={`text-right whitespace-nowrap font-medium ${transaction.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={transaction.transaction_type || 'none'}
                          onValueChange={(value) => onCategorize({ 
                            transactionId: transaction.id, 
                            category: value === 'none' ? null : value 
                          })}
                        >
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- None --</SelectItem>
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {transaction.is_auto_categorized && (
                          <Badge variant="secondary" className="text-xs">Auto</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {filteredTransactions.length > 100 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Showing first 100 of {filteredTransactions.length} transactions
          </p>
        )}
      </CardContent>
    </Card>
  );
}
