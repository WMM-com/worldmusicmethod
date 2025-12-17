import { TaxBreakdown } from '@/hooks/useTaxCalculator';
import { TaxCountry, TAX_CONFIGS } from '@/lib/taxConfig';

interface ExportData {
  calculation: TaxBreakdown;
  country: TaxCountry;
  taxYear: string;
}

export function exportTaxBreakdownToCSV({ calculation, country, taxYear }: ExportData): void {
  const config = TAX_CONFIGS[country];
  const currencySymbol = config.currencySymbol;
  
  const formatAmount = (amount: number) => amount.toFixed(2);
  
  const rows: string[][] = [
    // Header
    ['Tax Breakdown Report'],
    [''],
    ['Country', config.countryName],
    ['Tax Year', taxYear],
    ['Currency', config.currencyCode],
    ['Generated', new Date().toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })],
    [''],
    
    // Income Summary
    ['INCOME SUMMARY'],
    ['Description', 'Amount'],
    ['Event Income (from completed events)', formatAmount(calculation.eventIncome)],
    ['Other Income (royalties, merch, etc.)', formatAmount(calculation.otherIncomeTotal)],
    ['Total Gross Income', formatAmount(calculation.grossIncome)],
    [''],
    
    // Expenses
    ['EXPENSES'],
    ['Description', 'Amount'],
    ['Total Expenses', formatAmount(calculation.totalExpenses)],
    ['Tax Deductible Portion', formatAmount(calculation.deductibleExpenses)],
    ['Net Income (Gross - Deductible Expenses)', formatAmount(calculation.netIncome)],
    [''],
    
    // Allowances
    ['ALLOWANCES & DEDUCTIONS'],
    ['Description', 'Amount'],
  ];

  if (calculation.personalAllowance > 0) {
    rows.push(['Personal Allowance', formatAmount(calculation.personalAllowance)]);
  }
  
  if (calculation.tradingAllowance > 0) {
    const label = country === 'US' ? 'Standard Deduction' : 'Trading Allowance';
    rows.push([label, formatAmount(calculation.tradingAllowance)]);
  }
  
  rows.push(['Taxable Income', formatAmount(calculation.taxableIncome)]);
  rows.push(['']);
  
  // Income Tax
  rows.push(['INCOME TAX BREAKDOWN']);
  rows.push(['Tax Band', 'Rate (%)', 'Tax Amount']);
  
  if (calculation.incomeTaxBreakdown.length > 0) {
    for (const bracket of calculation.incomeTaxBreakdown) {
      rows.push([bracket.bracket, bracket.rate.toString(), formatAmount(bracket.amount)]);
    }
  } else {
    rows.push(['No income tax due', '', '0.00']);
  }
  
  rows.push(['Total Income Tax', '', formatAmount(calculation.incomeTax)]);
  rows.push(['']);
  
  // Social Contributions
  const socialTitle = country === 'UK' ? 'NATIONAL INSURANCE' : 
                      country === 'IE' ? 'USC & PRSI' : 
                      'SELF-EMPLOYMENT TAX';
  
  rows.push([socialTitle]);
  rows.push(['Description', 'Amount']);
  
  if (calculation.socialContributions.length > 0) {
    for (const sc of calculation.socialContributions) {
      rows.push([sc.name, formatAmount(sc.amount)]);
    }
    rows.push(['Total Contributions', formatAmount(calculation.totalSocialContributions)]);
  } else {
    rows.push(['No contributions due', '0.00']);
  }
  
  rows.push(['']);
  
  // Summary
  rows.push(['TAX LIABILITY SUMMARY']);
  rows.push(['Description', 'Amount']);
  rows.push(['Income Tax', formatAmount(calculation.incomeTax)]);
  rows.push(['Social Contributions', formatAmount(calculation.totalSocialContributions)]);
  rows.push(['']);
  rows.push(['TOTAL ESTIMATED TAX LIABILITY', formatAmount(calculation.totalTaxLiability)]);
  rows.push(['Effective Tax Rate', `${calculation.effectiveRate.toFixed(1)}%`]);
  rows.push(['']);
  
  // Disclaimer
  rows.push(['DISCLAIMER']);
  rows.push(['This is an estimate only. Please consult a qualified accountant for accurate tax advice.']);
  rows.push(['Tax calculations are based on self-employed/sole trader rates and may not account for all reliefs or circumstances.']);
  
  // Convert to CSV
  const csvContent = rows
    .map(row => row.map(cell => {
      // Escape cells containing commas or quotes
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','))
    .join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const filename = `tax-breakdown-${country.toLowerCase()}-${taxYear}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
