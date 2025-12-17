import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useTaxCalculator } from '@/hooks/useTaxCalculator';
import { TAX_CONFIGS, TaxCountry, getCurrentTaxYear, getTaxYearsForCountry } from '@/lib/taxConfig';
import { exportTaxBreakdownToCSV } from '@/lib/exportTaxBreakdown';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Calculator, Settings, AlertTriangle, TrendingDown, TrendingUp, Receipt, Download } from 'lucide-react';
import { toast } from 'sonner';

export function TaxEstimator() {
  const { profile } = useAuth();
  const taxCountry = profile?.tax_country as TaxCountry | null;
  
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>('');
  
  // Initialize tax year when country is available
  useEffect(() => {
    if (taxCountry && !selectedTaxYear) {
      setSelectedTaxYear(getCurrentTaxYear(taxCountry));
    }
  }, [taxCountry, selectedTaxYear]);

  const { calculation, formatCurrency } = useTaxCalculator(taxCountry, selectedTaxYear);

  if (!taxCountry) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tax Estimator
          </CardTitle>
          <CardDescription>Get an estimate of your tax liability</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Set your tax residency country in{' '}
              <Link to="/settings" className="text-primary underline hover:no-underline">
                Settings
              </Link>{' '}
              to see your estimated tax liability.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const config = TAX_CONFIGS[taxCountry];
  const taxYears = getTaxYearsForCountry(taxCountry);

  const handleExport = () => {
    if (!calculation || !taxCountry) return;
    
    try {
      exportTaxBreakdownToCSV({
        calculation,
        country: taxCountry,
        taxYear: selectedTaxYear,
      });
      toast.success('Tax breakdown exported to CSV');
    } catch (error) {
      toast.error('Failed to export tax breakdown');
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Tax Estimator - {config.countryName}
            </CardTitle>
            <CardDescription>Estimated self-employment tax liability</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedTaxYear} onValueChange={setSelectedTaxYear}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tax Year" />
              </SelectTrigger>
              <SelectContent>
                {taxYears.map((ty) => (
                  <SelectItem key={ty.value} value={ty.value}>
                    {ty.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {calculation && (
              <Button variant="outline" size="icon" onClick={handleExport} title="Export to CSV">
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-sm">
            This is an estimate only. Consult a qualified accountant for accurate tax advice.
          </AlertDescription>
        </Alert>

        {calculation && (
          <>
            {/* Income Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Gross Income
                </p>
                <p className="text-xl font-semibold">{formatCurrency(calculation.grossIncome)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  Expenses
                </p>
                <p className="text-xl font-semibold text-destructive">-{formatCurrency(calculation.totalExpenses)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Receipt className="h-4 w-4" />
                  Net Income
                </p>
                <p className="text-xl font-semibold text-success">{formatCurrency(calculation.netIncome)}</p>
              </div>
            </div>

            <Separator />

            {/* Allowances */}
            <div className="space-y-2">
              <h4 className="font-medium">Allowances & Deductions</h4>
              <div className="text-sm space-y-1">
                {calculation.personalAllowance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Personal Allowance</span>
                    <span>{formatCurrency(calculation.personalAllowance)}</span>
                  </div>
                )}
                {calculation.tradingAllowance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {taxCountry === 'US' ? 'Standard Deduction' : 'Trading Allowance'}
                    </span>
                    <span>{formatCurrency(calculation.tradingAllowance)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-1">
                  <span>Taxable Income</span>
                  <span>{formatCurrency(calculation.taxableIncome)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Income Tax Breakdown */}
            <div className="space-y-2">
              <h4 className="font-medium">Income Tax</h4>
              <div className="text-sm space-y-1">
                {calculation.incomeTaxBreakdown.length > 0 ? (
                  calculation.incomeTaxBreakdown.map((bracket, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {bracket.bracket} @ {bracket.rate}%
                      </span>
                      <span>{formatCurrency(bracket.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No income tax due</p>
                )}
                <div className="flex justify-between font-medium pt-1">
                  <span>Total Income Tax</span>
                  <span>{formatCurrency(calculation.incomeTax)}</span>
                </div>
              </div>
            </div>

            {/* Social Contributions */}
            {calculation.socialContributions.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">
                    {taxCountry === 'UK' ? 'National Insurance' : 
                     taxCountry === 'IE' ? 'USC & PRSI' : 
                     'Self-Employment Tax'}
                  </h4>
                  <div className="text-sm space-y-1">
                    {calculation.socialContributions.map((sc, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-muted-foreground">{sc.name}</span>
                        <span>{formatCurrency(sc.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-medium pt-1">
                      <span>Total Contributions</span>
                      <span>{formatCurrency(calculation.totalSocialContributions)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Total */}
            <div className="bg-destructive/10 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Estimated Tax Liability</span>
                <span className="text-2xl font-bold text-destructive">
                  {formatCurrency(calculation.totalTaxLiability)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Effective Tax Rate</span>
                <span>{calculation.effectiveRate.toFixed(1)}%</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" asChild size="sm">
                <Link to="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Change Tax Settings
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
