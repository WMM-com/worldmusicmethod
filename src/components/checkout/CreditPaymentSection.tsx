import { useState, useEffect } from 'react';
import { Wallet, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/hooks/useGeoPricing';

interface CreditPaymentSectionProps {
  creditBalance: number; // in cents
  cartTotal: number; // in the display currency amount (dollars/pounds/euros)
  currency: string;
  onCreditUsageChange: (useCredits: boolean, creditAmountUsed: number) => void;
}

export function CreditPaymentSection({
  creditBalance,
  cartTotal,
  currency,
  onCreditUsageChange,
}: CreditPaymentSectionProps) {
  const [useCredits, setUseCredits] = useState(false);

  // Convert credit balance from cents to dollars for display
  const creditBalanceInDollars = creditBalance / 100;
  
  // Calculate how much credit can be applied (can't exceed cart total)
  const maxCreditToUse = Math.min(creditBalanceInDollars, cartTotal);
  
  // Calculate new total after credits
  const newTotal = Math.max(0, cartTotal - maxCreditToUse);
  
  // Check if credits cover the full amount
  const isFullyCoveredByCredits = creditBalanceInDollars >= cartTotal;

  useEffect(() => {
    if (useCredits) {
      // When using credits, pass the amount in cents to the backend
      onCreditUsageChange(true, Math.round(maxCreditToUse * 100));
    } else {
      onCreditUsageChange(false, 0);
    }
  }, [useCredits, maxCreditToUse, onCreditUsageChange]);

  // Don't show if no credits available
  if (creditBalance <= 0) {
    return null;
  }

  return (
    <div className="py-4 border-b border-border">
      <div className="space-y-3">
        {/* Available Credit Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Available Referral Credit:</span>
          </div>
          <span className="font-medium text-primary">
            {formatPrice(creditBalanceInDollars, currency)}
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
              -{formatPrice(maxCreditToUse, currency)}
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
