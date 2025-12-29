// Shared currency configuration for Left Brain

export const CURRENCIES = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
] as const;

// Approximate exchange rates TO USD (base currency for conversions)
// These are static estimates - the user can override the converted amount
export const EXCHANGE_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  GBP: 1.27,
  EUR: 1.08,
  CAD: 0.74,
  AUD: 0.65,
  CHF: 1.13,
  SEK: 0.095,
  NOK: 0.091,
  DKK: 0.14,
  JPY: 0.0067,
};

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find(c => c.code === code)?.symbol || code;
}

export function formatCurrency(amount: number, currencyCode: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', { 
    style: 'currency', 
    currency: currencyCode 
  }).format(amount);
}

/**
 * Convert an amount from one currency to another using static exchange rates.
 * This is an estimate - actual rates may vary.
 */
export function convertCurrency(
  amount: number, 
  fromCurrency: string, 
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;
  
  // Convert to USD first, then to target currency
  const toUSD = EXCHANGE_RATES_TO_USD[fromCurrency] || 1;
  const fromUSD = EXCHANGE_RATES_TO_USD[toCurrency] || 1;
  
  // Return exact value without rounding
  return (amount * toUSD / fromUSD);
}
