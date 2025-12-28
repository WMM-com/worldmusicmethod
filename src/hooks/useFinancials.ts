import { useMemo } from 'react';
import { useEvents } from './useEvents';
import { useExpenses } from './useExpenses';
import { useInvoices } from './useInvoices';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';

interface FinancialSummary {
  totalEarnings: number;
  paidEarnings: number;
  unpaidEarnings: number;
  overdueEarnings: number;
  totalExpenses: number;
  netIncome: number;
  monthlyEarnings: number;
  monthlyExpenses: number;
  yearlyEarnings: number;
  yearlyExpenses: number;
}

interface MonthlyData {
  month: string;
  earnings: number;
  expenses: number;
  net: number;
}

export function useFinancials() {
  const { events } = useEvents();
  const { expenses } = useExpenses();
  const { invoices } = useInvoices();

  const summary = useMemo<FinancialSummary>(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    // Exclude cancelled events from all earnings calculations
    const completedEvents = events.filter(e => e.status === 'completed');
    
    const totalEarnings = completedEvents.reduce((sum, e) => sum + (e.fee || 0), 0);
    const paidEarnings = completedEvents
      .filter(e => e.payment_status === 'paid')
      .reduce((sum, e) => sum + (e.fee || 0), 0);
    const unpaidEarnings = completedEvents
      .filter(e => e.payment_status === 'unpaid')
      .reduce((sum, e) => sum + (e.fee || 0), 0);
    const overdueEarnings = completedEvents
      .filter(e => e.payment_status === 'overdue')
      .reduce((sum, e) => sum + (e.fee || 0), 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const monthlyEvents = completedEvents.filter(e => {
      const date = parseISO(e.start_time);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });
    const monthlyEarnings = monthlyEvents.reduce((sum, e) => sum + (e.fee || 0), 0);

    const monthlyExpensesList = expenses.filter(e => {
      const date = parseISO(e.date);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });
    const monthlyExpenses = monthlyExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

    const yearlyEvents = completedEvents.filter(e => {
      const date = parseISO(e.start_time);
      return isWithinInterval(date, { start: yearStart, end: yearEnd });
    });
    const yearlyEarnings = yearlyEvents.reduce((sum, e) => sum + (e.fee || 0), 0);

    const yearlyExpensesList = expenses.filter(e => {
      const date = parseISO(e.date);
      return isWithinInterval(date, { start: yearStart, end: yearEnd });
    });
    const yearlyExpenses = yearlyExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      totalEarnings,
      paidEarnings,
      unpaidEarnings,
      overdueEarnings,
      totalExpenses,
      netIncome: totalEarnings - totalExpenses,
      monthlyEarnings,
      monthlyExpenses,
      yearlyEarnings,
      yearlyExpenses,
    };
  }, [events, expenses]);

  const monthlyData = useMemo<MonthlyData[]>(() => {
    const now = new Date();
    const months: MonthlyData[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthName = date.toLocaleDateString('en-GB', { month: 'short' });

      const monthEvents = events.filter(e => {
        if (e.status !== 'completed') return false;
        const eventDate = parseISO(e.start_time);
        return isWithinInterval(eventDate, { start, end });
      });
      const earnings = monthEvents.reduce((sum, e) => sum + (e.fee || 0), 0);

      const monthExpenses = expenses.filter(e => {
        const expenseDate = parseISO(e.date);
        return isWithinInterval(expenseDate, { start, end });
      });
      const expenseTotal = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      months.push({
        month: monthName,
        earnings,
        expenses: expenseTotal,
        net: earnings - expenseTotal,
      });
    }

    return months;
  }, [events, expenses]);

  const expensesByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    
    expenses.forEach(e => {
      if (!categories[e.category]) {
        categories[e.category] = 0;
      }
      categories[e.category] += e.amount || 0;
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
    }));
  }, [expenses]);

  return {
    summary,
    monthlyData,
    expensesByCategory,
  };
}
