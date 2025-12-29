import { TaxBreakdown } from '@/hooks/useTaxCalculator';
import { TaxCountry, TAX_CONFIGS } from '@/lib/taxConfig';
import { jsPDF } from 'jspdf';

interface ExportData {
  calculation: TaxBreakdown;
  country: TaxCountry;
  taxYear: string;
}

export function exportTaxBreakdownToCSV({ calculation, country, taxYear }: ExportData): void {
  const config = TAX_CONFIGS[country];
  
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

export function exportTaxBreakdownToPDF({ calculation, country, taxYear }: ExportData): void {
  const config = TAX_CONFIGS[country];
  const currencySymbol = config.currencySymbol;
  
  const formatAmount = (amount: number) => `${currencySymbol}${amount.toFixed(2)}`;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Tax Breakdown Report', pageWidth / 2, y, { align: 'center' });
  y += 12;
  
  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${config.countryName} - Tax Year ${taxYear}`, pageWidth / 2, y, { align: 'center' });
  y += 8;
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 15;
  
  // Divider line
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;
  
  // Income Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Income Summary', margin, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const addRow = (label: string, value: string, indent: number = 0) => {
    doc.text(label, margin + indent, y);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    y += 7;
  };
  
  addRow('Event Income', formatAmount(calculation.eventIncome));
  addRow('Other Income', formatAmount(calculation.otherIncomeTotal));
  doc.setFont('helvetica', 'bold');
  addRow('Total Gross Income', formatAmount(calculation.grossIncome));
  doc.setFont('helvetica', 'normal');
  y += 8;
  
  // Expenses Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Expenses', margin, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  addRow('Total Expenses', formatAmount(calculation.totalExpenses));
  addRow('Tax Deductible Portion', formatAmount(calculation.deductibleExpenses));
  doc.setFont('helvetica', 'bold');
  addRow('Net Income', formatAmount(calculation.netIncome));
  doc.setFont('helvetica', 'normal');
  y += 8;
  
  // Allowances Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Allowances & Deductions', margin, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (calculation.personalAllowance > 0) {
    addRow('Personal Allowance', formatAmount(calculation.personalAllowance));
  }
  if (calculation.tradingAllowance > 0) {
    const label = country === 'US' ? 'Standard Deduction' : 'Trading Allowance';
    addRow(label, formatAmount(calculation.tradingAllowance));
  }
  doc.setFont('helvetica', 'bold');
  addRow('Taxable Income', formatAmount(calculation.taxableIncome));
  doc.setFont('helvetica', 'normal');
  y += 8;
  
  // Income Tax Breakdown
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Income Tax', margin, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (calculation.incomeTaxBreakdown.length > 0) {
    for (const bracket of calculation.incomeTaxBreakdown) {
      addRow(`${bracket.bracket} @ ${bracket.rate}%`, formatAmount(bracket.amount));
    }
  } else {
    addRow('No income tax due', formatAmount(0));
  }
  doc.setFont('helvetica', 'bold');
  addRow('Total Income Tax', formatAmount(calculation.incomeTax));
  doc.setFont('helvetica', 'normal');
  y += 8;
  
  // Social Contributions
  const socialTitle = country === 'UK' ? 'National Insurance' : 
                      country === 'IE' ? 'USC & PRSI' : 
                      'Self-Employment Tax';
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(socialTitle, margin, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (calculation.socialContributions.length > 0) {
    for (const sc of calculation.socialContributions) {
      addRow(sc.name, formatAmount(sc.amount));
    }
    doc.setFont('helvetica', 'bold');
    addRow('Total Contributions', formatAmount(calculation.totalSocialContributions));
    doc.setFont('helvetica', 'normal');
  } else {
    addRow('No contributions due', formatAmount(0));
  }
  y += 10;
  
  // Summary box
  doc.setFillColor(254, 243, 199); // Light yellow
  doc.rect(margin, y, pageWidth - (margin * 2), 30, 'F');
  y += 12;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Estimated Tax Liability', margin + 5, y);
  doc.setFontSize(16);
  doc.text(formatAmount(calculation.totalTaxLiability), pageWidth - margin - 5, y, { align: 'right' });
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Effective Tax Rate: ${calculation.effectiveRate.toFixed(1)}%`, margin + 5, y);
  y += 20;
  
  // Disclaimer
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('DISCLAIMER: This is an estimate only. Please consult a qualified accountant for accurate tax advice.', margin, y);
  y += 5;
  doc.text('Tax calculations are based on self-employed/sole trader rates and may not account for all reliefs or circumstances.', margin, y);
  
  // Save
  const filename = `tax-breakdown-${country.toLowerCase()}-${taxYear}.pdf`;
  doc.save(filename);
}
