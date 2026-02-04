import { useState, useEffect } from 'react';
import { Wallet, Check, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/hooks/useGeoPricing';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CreditPaymentSectionProps {
  creditBalance: number; // in cents (USD)
  cartTotal: number; // in the display currency amount (dollars/pounds/euros)
  currency: string;
  geoConversionRate?: number; // Ratio to convert USD to regional currency (e.g., 0.86 for EUR, 0.80 for GBP)
  onCreditUsageChange: (useCredits: boolean, creditAmountUsed: number) => void;
}

/**
 * Currency conversion rates from USD (approximate)
 * These are fallback rates - ideally passed from geo-pricing context
 */
const getApproximateCurrencyRate = (currency: string): number => {
  const rates: Record<string, number> = {
    USD: 1,
    GBP: 0.79, // 1 USD = ~0.79 GBP
    EUR: 0.92, // 1 USD = ~0.92 EUR
  };
  return rates[currency] || 1;
};

export function CreditPaymentSection({
  creditBalance,
  cartTotal,
  currency,
  geoConversionRate,
  onCreditUsageChange,
}: CreditPaymentSectionProps) {
  const [useCredits, setUseCredits] = useState(false);

  // Credit balance is stored in USD cents
  const creditBalanceInUsd = creditBalance / 100;
  
  // Convert credit balance to regional currency for display
  const conversionRate = geoConversionRate || getApproximateCurrencyRate(currency);
  const creditBalanceInRegionalCurrency = creditBalanceInUsd * conversionRate;
  
  // Calculate how much credit can be applied (can't exceed cart total in regional currency)
  const maxCreditToUseInRegionalCurrency = Math.min(creditBalanceInRegionalCurrency, cartTotal);
  
  // Convert back to USD cents for backend (credits are always stored/deducted in USD)
  const maxCreditToUseInUsdCents = Math.round((maxCreditToUseInRegionalCurrency / conversionRate) * 100);
  
  // Calculate new total after credits (in regional currency)
  const newTotal = Math.max(0, cartTotal - maxCreditToUseInRegionalCurrency);
  
  // Check if credits cover the full amount
  const isFullyCoveredByCredits = creditBalanceInRegionalCurrency >= cartTotal;

  useEffect(() => {
    if (useCredits) {
      // Pass the amount in USD cents to the backend (for proper deduction)
      onCreditUsageChange(true, maxCreditToUseInUsdCents);
    } else {
      onCreditUsageChange(false, 0);
    }
  }, [useCredits, maxCreditToUseInUsdCents, onCreditUsageChange]);

  // Don't show if no credits available
  if (creditBalance <= 0) {
    return null;
  }

  const isNonUsdCurrency = currency !== 'USD';

  return (
    <div className="py-4 border-b border-border">
      <div className="space-y-3">
        {/* Available Credit Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Available Referral Credit:</span>
            {isNonUsdCurrency && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Credits are stored in USD (${creditBalanceInUsd.toFixed(2)}) and converted to your local currency
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <span className="font-medium text-primary">
            {formatPrice(creditBalanceInRegionalCurrency, currency)}
          </span>
        </div>

        {/* Use Credit Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border border-border">
          <div className="flex items-center gap-2">
            <Switch
              id="use-credits"
              checked={useCredits}
              onCheckedChange={setUseCredits}
            />
            <Label htmlFor="use-credits" className="cursor-pointer font-medium">
              Use Referral Credit
            </Label>
          </div>
          {useCredits && (
            <span className="text-sm text-primary font-medium">
              -{formatPrice(maxCreditToUseInRegionalCurrency, currency)}
            </span>
          )}
        </div>

        {/* Show remaining after credits or "Free" message */}
        {useCredits && (
          <div className="text-center">
            {isFullyCoveredByCredits ? (
              <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                <Check className="h-5 w-5" />
                <span>Free with Referral Credit!</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Remaining to pay: <span className="font-medium text-foreground">{formatPrice(newTotal, currency)}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
