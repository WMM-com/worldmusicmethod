import { useMemo } from 'react';
import { useEvents } from './useEvents';
import { useExpenses } from './useExpenses';
import { useOtherIncome } from './useOtherIncome';
import {
  TaxCountry,
  TAX_CONFIGS,
  TaxBracket,
  formatCurrencyForCountry,
} from '@/lib/taxConfig';
import { convertCurrency } from '@/lib/currency';
import { startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';

export interface TaxBreakdown {
  eventIncome: number;
  otherIncomeTotal: number;
  grossIncome: number;
  totalExpenses: number;
  deductibleExpenses: number;
  netIncome: number;
  personalAllowance: number;
  tradingAllowance: number;
  taxableIncome: number;
  incomeTax: number;
  incomeTaxBreakdown: { bracket: string; amount: number; rate: number }[];
  socialContributions: { name: string; amount: number; info?: string }[];
  totalSocialContributions: number;
  totalTaxLiability: number;
  effectiveRate: number;
}

function calculateBracketedTax(
  income: number,
  brackets: TaxBracket[]
): { total: number; breakdown: { bracket: string; amount: number; rate: number }[] } {
  let remaining = income;
  let total = 0;
  const breakdown: { bracket: string; amount: number; rate: number }[] = [];

  for (const bracket of brackets) {
    if (remaining <= 0) break;

    const bracketMin = bracket.min;
    const bracketMax = bracket.max ?? Infinity;
    const bracketSize = bracketMax - bracketMin;

    if (income <= bracketMin) continue;

    const incomeInBracket = Math.min(
      remaining,
      income > bracketMax ? bracketSize : income - bracketMin
    );
    const taxInBracket = incomeInBracket * bracket.rate;

    if (incomeInBracket > 0) {
      total += taxInBracket;
      breakdown.push({
        bracket: bracket.max
          ? `${formatNumber(bracket.min)} - ${formatNumber(bracket.max)}`
          : `Over ${formatNumber(bracket.min)}`,
        amount: taxInBracket,
        rate: bracket.rate * 100,
      });
    }

    remaining = Math.max(0, income - bracketMax);
  }

  return { total, breakdown };
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-GB').format(num);
}

function getTaxYearDates(
  country: TaxCountry,
  taxYear: string
): { start: Date; end: Date } {
  const config = TAX_CONFIGS[country];
  const ty = config.taxYears.find((t) => t.value === taxYear);

  if (ty) {
    return { start: ty.startDate, end: ty.endDate };
  }

  // Fallback to calendar year
  const year = parseInt(taxYear.split('-')[0] || taxYear);
  return {
    start: startOfYear(new Date(year, 0, 1)),
    end: endOfYear(new Date(year, 0, 1)),
  };
}

function toTaxCurrency(amount: number, fromCurrency: string | null | undefined, toCurrency: string): number {
  const from = fromCurrency || toCurrency;
  return convertCurrency(amount || 0, from, toCurrency);
}

export function useTaxCalculator(country: TaxCountry | null, taxYear: string) {
  const { events } = useEvents();
  const { expenses } = useExpenses();
  const { otherIncome } = useOtherIncome();

  const calculation = useMemo<TaxBreakdown | null>(() => {
    if (!country) return null;

    const config = TAX_CONFIGS[country];
    const taxCurrency = config.currencyCode;
    const taxConfig = config.getTaxConfig(taxYear);
    const { start, end } = getTaxYearDates(country, taxYear);

    // Calculate gross income from completed events in the tax year
    const yearEvents = events.filter((e) => {
      if (e.status !== 'completed') return false;
      const eventDate = parseISO(e.start_time);
      return isWithinInterval(eventDate, { start, end });
    });
    const eventIncome = yearEvents.reduce(
      (sum, e) => sum + toTaxCurrency(e.fee || 0, (e as any).currency, taxCurrency),
      0
    );

    // Calculate other income in the tax year
    const yearOtherIncome = otherIncome.filter((inc) => {
      const incomeDate = parseISO(inc.date);
      return isWithinInterval(incomeDate, { start, end });
    });
    const otherIncomeTotal = yearOtherIncome.reduce(
      (sum, inc) => sum + toTaxCurrency(inc.amount || 0, (inc as any).currency, taxCurrency),
      0
    );

    // Total gross income
    const grossIncome = eventIncome + otherIncomeTotal;

    // Calculate expenses in the tax year (total and deductible)
    const yearExpenses = expenses.filter((e) => {
      const expenseDate = parseISO(e.date);
      return isWithinInterval(expenseDate, { start, end });
    });

    const totalExpenses = yearExpenses.reduce(
      (sum, e) => sum + toTaxCurrency(e.amount || 0, (e as any).currency, taxCurrency),
      0
    );

    // Calculate deductible expenses (only count the deductible portion)
    const deductibleExpenses = yearExpenses.reduce((sum, e) => {
      if (!e.is_tax_deductible) return sum;
      const deductiblePortionRaw = (e.amount || 0) * ((e.deductible_percentage ?? 100) / 100);
      const deductiblePortion = toTaxCurrency(deductiblePortionRaw, (e as any).currency, taxCurrency);
      return sum + deductiblePortion;
    }, 0);

    // Net income before allowances (using deductible expenses)
    const netIncome = Math.max(0, grossIncome - deductibleExpenses);

    // Apply allowances
    const { personalAllowance, tradingAllowance, incomeTaxBrackets, socialContributions } = taxConfig;

    // For US, tradingAllowance is standard deduction
    // For UK, personal allowance reduces at £125,140
    let effectivePersonalAllowance = personalAllowance;
    if (country === 'UK' && netIncome > 100000) {
      // Reduce by £1 for every £2 over £100,000
      const reduction = Math.floor((netIncome - 100000) / 2);
      effectivePersonalAllowance = Math.max(0, personalAllowance - reduction);
    }

    // Taxable income after allowances
    const totalAllowances = effectivePersonalAllowance + (country === 'UK' ? tradingAllowance : 0);
    const taxableIncome = Math.max(0, netIncome - totalAllowances);

    // For US, apply standard deduction
    const usDeductedIncome = country === 'US' ? Math.max(0, netIncome - tradingAllowance) : taxableIncome;
    const incomeForTax = country === 'US' ? usDeductedIncome : taxableIncome;

    // Calculate income tax
    const { total: incomeTax, breakdown: incomeTaxBreakdown } = calculateBracketedTax(
      incomeForTax,
      incomeTaxBrackets
    );

    // Calculate social contributions
    const socialContributionResults: { name: string; amount: number; info?: string }[] = [];

    for (const sc of socialContributions) {
      let amount = 0;

      if (sc.type === 'flat') {
        if (netIncome > (sc.threshold || 0)) {
          amount = sc.flatRate || 0;
        }
      } else if (sc.type === 'percentage') {
        const applicableIncome = Math.max(0, netIncome - (sc.threshold || 0));
        // For US self-employment tax, only 92.35% of net earnings are subject
        const adjustedIncome = country === 'US' ? applicableIncome * 0.9235 : applicableIncome;
        amount = adjustedIncome * (sc.rate || 0);
      } else if (sc.type === 'brackets' && sc.brackets) {
        // For Ireland USC, only applies if income > €13,000
        if (country === 'IE' && sc.name.includes('USC') && grossIncome <= 13000) {
          amount = 0;
        } else {
          const { total } = calculateBracketedTax(netIncome, sc.brackets);
          amount = total;
        }
      }

      if (amount > 0) {
        socialContributionResults.push({
          name: sc.name,
          amount,
          info: sc.additionalInfo,
        });
      }
    }

    const totalSocialContributions = socialContributionResults.reduce((sum, sc) => sum + sc.amount, 0);
    const totalTaxLiability = incomeTax + totalSocialContributions;
    const effectiveRate = netIncome > 0 ? (totalTaxLiability / netIncome) * 100 : 0;

    return {
      eventIncome,
      otherIncomeTotal,
      grossIncome,
      totalExpenses,
      deductibleExpenses,
      netIncome,
      personalAllowance: effectivePersonalAllowance,
      tradingAllowance: country === 'US' ? tradingAllowance : country === 'UK' ? tradingAllowance : 0,
      taxableIncome: incomeForTax,
      incomeTax,
      incomeTaxBreakdown,
      socialContributions: socialContributionResults,
      totalSocialContributions,
      totalTaxLiability,
      effectiveRate,
    };
  }, [country, taxYear, events, expenses, otherIncome]);

  return {
    calculation,
    formatCurrency: (amount: number) =>
      country ? formatCurrencyForCountry(amount, country) : `£${amount.toFixed(2)}`,
  };
}

