import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Coins } from 'lucide-react';
import { format } from 'date-fns';
import { useFinancialDashboard } from '@/hooks/useFinancialDashboard';
import { FinancialOverviewCards } from './finances/FinancialOverviewCards';
import { AccountBalancesCard } from './finances/AccountBalancesCard';
import { SyncControls } from './finances/SyncControls';
import { IncomeAnalysis } from './finances/IncomeAnalysis';
import { ExpenseBreakdown } from './finances/ExpenseBreakdown';
import { TransactionList } from './finances/TransactionList';
import { MembershipAnalytics } from './finances/MembershipAnalytics';
import { ForecastView } from './finances/ForecastView';

export function AdminFinances() {
  const {
    summary,
    transactions,
    forecast,
    syncLogs,
    summaryLoading,
    transactionsLoading,
    forecastLoading,
    isSyncing,
    currencyView,
    setCurrencyView,
    dateRange,
    setDateRange,
    syncPayPal,
    syncWise,
    syncExchangeRates,
    syncAll,
    categorizeTransaction,
    applyAutoCategorization,
  } = useFinancialDashboard();

  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.start, 'dd MMM')} - {format(dateRange.end, 'dd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.start, to: dateRange.end }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ start: range.from, end: range.to });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Quick date presets */}
          <div className="hidden md:flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                const now = new Date();
                setDateRange({
                  start: new Date(now.getFullYear(), now.getMonth(), 1),
                  end: now,
                });
              }}
            >
              This Month
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                const now = new Date();
                setDateRange({
                  start: new Date(now.getFullYear(), 0, 1),
                  end: now,
                });
              }}
            >
              YTD
            </Button>
          </div>
        </div>

        {/* Currency toggle */}
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="currency-view" className="text-sm">
            Convert to GBP
          </Label>
          <Switch
            id="currency-view"
            checked={currencyView === 'gbp'}
            onCheckedChange={(checked) => setCurrencyView(checked ? 'gbp' : 'native')}
          />
        </div>
      </div>

      {/* Sync Controls */}
      <SyncControls
        syncLogs={syncLogs}
        isSyncing={isSyncing}
        onSyncPayPal={syncPayPal}
        onSyncWise={syncWise}
        onSyncExchangeRates={syncExchangeRates}
        onSyncAll={syncAll}
      />

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="memberships">Memberships</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <FinancialOverviewCards 
            summary={summary} 
            isLoading={summaryLoading} 
            currencyView={currencyView}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AccountBalancesCard summary={summary} isLoading={summaryLoading} />
            <MembershipAnalytics summary={summary} isLoading={summaryLoading} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IncomeAnalysis summary={summary} isLoading={summaryLoading} currencyView={currencyView} />
            <ExpenseBreakdown summary={summary} isLoading={summaryLoading} />
          </div>
        </TabsContent>

        <TabsContent value="income" className="space-y-6 mt-6">
          <IncomeAnalysis summary={summary} isLoading={summaryLoading} currencyView={currencyView} />
          {/* Show income transactions only */}
          <TransactionList
            transactions={transactions.filter(t => t.amount > 0)}
            isLoading={transactionsLoading}
            onCategorize={categorizeTransaction}
            onApplyAutoCategorization={applyAutoCategorization}
            isSyncing={isSyncing}
          />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6 mt-6">
          <ExpenseBreakdown summary={summary} isLoading={summaryLoading} />
          {/* Show expense transactions only */}
          <TransactionList
            transactions={transactions.filter(t => t.amount < 0)}
            isLoading={transactionsLoading}
            onCategorize={categorizeTransaction}
            onApplyAutoCategorization={applyAutoCategorization}
            isSyncing={isSyncing}
          />
        </TabsContent>

        <TabsContent value="memberships" className="space-y-6 mt-6">
          <MembershipAnalytics summary={summary} isLoading={summaryLoading} />
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6 mt-6">
          <ForecastView forecast={forecast} isLoading={forecastLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
